'use client';

export default function FormShell({ title, onBack, onSubmit, children }) {
  return (
    <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{title}</h1>

        <form
          onSubmit={onSubmit}
          className="mt-7 space-y-5 rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
        >
          {children}
        </form>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand';
