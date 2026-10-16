import { promises as fs } from 'fs';
import path from 'path';
import { readJsonCollection } from '../../../../../lib/jsonStore';
import { getSessionUser, isStaff, unauthorizedResponse } from '../../../../../lib/serverAuth';

export async function GET(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();

  const ebooks = await readJsonCollection('ebooks.json');
  const ebook = ebooks.find((item) => String(item.id) === String(params.id));
  if (!ebook) return Response.json({ error: 'E-book not found' }, { status: 404 });

  if (!isStaff(user)) {
    if (String(user.role).toLowerCase() !== 'student') return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    const requests = await readJsonCollection('requests.json');
    const approved = requests.some((item) => item.requestType === 'ebook'
      && String(item.ebookId) === String(ebook.id)
      && String(item.requestedBy || '').toLowerCase() === user.email.toLowerCase()
      && ['Accepted', 'Issued'].includes(item.status));
    if (!approved) return Response.json({ error: 'E-book access has not been approved' }, { status: 403 });
  }

  let filePath;
  if (ebook.storageFilename) {
    filePath = path.join(process.cwd(), 'data', 'ebooks', path.basename(ebook.storageFilename));
  } else if (ebook.pdfUrl) {
    filePath = path.join(process.cwd(), 'public', 'ebooks', path.basename(new URL(ebook.pdfUrl, request.url).pathname));
  }
  if (!filePath) return Response.json({ error: 'PDF file is unavailable' }, { status: 404 });

  try {
    const content = await fs.readFile(filePath);
    return new Response(content, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${String(ebook.title || 'ebook').replace(/["\\/]/g, '')}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return Response.json({ error: 'PDF file is unavailable' }, { status: 404 });
  }
}