interface DealsDroppedFiltersNoticeProps {
  message: string;
}

export default function DealsDroppedFiltersNotice({ message }: DealsDroppedFiltersNoticeProps) {
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2.5 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2.5 text-sm text-foreground dark:border-accent/30 dark:bg-accent/15"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-4 w-4 shrink-0 text-accent"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
      <p>{message}</p>
    </div>
  );
}