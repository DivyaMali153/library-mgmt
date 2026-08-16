import ebookCatalog from '../../../data/ebooks.json';
import EbookDetails from '../../../components/Ebook/EbookDetails';

const routeMap = {
  '1': 'javascript-basics',
  '2': 'react-for-beginners',
  '3': 'html-css-guide',
  '4': 'computer-science',
};

export default function EbookDetailPage({ params }) {
  const bookId = routeMap[params.id] || params.id;
  const ebook = ebookCatalog.find((item) => String(item.id) === String(bookId)) || null;

  return <EbookDetails ebook={ebook} />;
}
