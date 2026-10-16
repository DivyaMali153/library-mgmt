import { Box, Typography } from '@mui/material';

export default function PageHeader({ eyebrow = 'LIBRARY WORKSPACE', title, description, action }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" color="primary.main" fontWeight={700} sx={{ letterSpacing: 1 }}>
          {eyebrow}
        </Typography>
        <Typography variant="h4" fontWeight={750} sx={{ fontSize: { xs: '1.55rem', sm: '1.85rem' }, lineHeight: 1.2 }}>
          {title}
        </Typography>
        {description ? <Typography color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography> : null}
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Box>
  );
}