// Layout wrapper enforcing consistent horizontal padding across pages.
// Two width tracks:
//   default → 1280px (spec baseline, used by interior pages)
//   wide    → 1440px (home + showcase pages that benefit from breathing room)
export default function Container({
  as: Tag = 'div',
  size = 'default',
  className = '',
  children,
}) {
  const max = size === 'wide' ? 'max-w-[1440px]' : 'max-w-container';
  return (
    <Tag className={`mx-auto w-full ${max} px-6 sm:px-8 ${className}`}>
      {children}
    </Tag>
  );
}
