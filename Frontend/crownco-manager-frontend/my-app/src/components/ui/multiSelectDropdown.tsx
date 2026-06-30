import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown } from "phosphor-react";

export interface MultiSelectOption {
  id: string;
  label: string;
}

export default function MultiSelectDropdown({
  label,
  placeholder,
  helperText,
  options,
  selectedIds,
  onChange,
  emptyStateText,
}: {
  label: string;
  placeholder: string;
  helperText?: string;
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (values: string[]) => void;
  emptyStateText: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedIds.includes(option.id)),
    [options, selectedIds]
  );

  const summary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.slice(0, 2).map((option) => option.label).join(", ") +
        (selectedOptions.length > 2 ? ` +${selectedOptions.length - 2} more` : "");

  const toggleOption = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((currentId) => currentId !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  return (
    <div ref={containerRef} className="space-y-2 relative">
      <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="w-full rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 text-left text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)] flex items-center justify-between gap-3"
        >
          <span className={selectedOptions.length === 0 ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]"}>
            {summary}
          </span>
          <CaretDown size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border border-[var(--border-color)] bg-white shadow-xl">
            <div className="p-2 border-b border-[var(--border-color)]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-md border border-[var(--border-color)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-2">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">{emptyStateText}</div>
              ) : (
                filteredOptions.map((option) => {
                  const checked = selectedIds.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-[var(--hover-bg)]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(option.id)}
                        className="h-4 w-4 rounded border-[var(--border-color)] text-[var(--primary-base)] focus:ring-[var(--primary-base)]"
                      />
                      <span className="flex-1 text-[var(--text-primary)]">{option.label}</span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border-color)] px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md bg-[var(--primary-base)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {helperText && <p className="text-[11px] text-[var(--text-secondary)]">{helperText}</p>}
    </div>
  );
}

