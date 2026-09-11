import { cn } from "@/lib/utils";
import { FILTER_CATEGORIES, type FilterCategory } from "@/data/products";

interface CategoryFilterProps {
  value: FilterCategory;
  onChange: (category: FilterCategory) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            value === category
              ? "border-accent bg-accent text-white"
              : "border-black/10 bg-white text-text-muted hover:border-accent hover:text-accent",
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
