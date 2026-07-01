'use client';

// Thin client-only wrapper around <form> so server-rendered marketing
// pages can include forms without violating the "event handlers can't
// cross the server-component boundary" rule.
//
// Wire `action` to a real handler when the backend endpoints exist.
export default function StubForm({ className = '', onSubmit, children, ...rest }) {
  function handle(e) {
    e.preventDefault();
    if (typeof onSubmit === 'function') onSubmit(e);
  }
  return (
    <form onSubmit={handle} className={className} {...rest}>
      {children}
    </form>
  );
}
