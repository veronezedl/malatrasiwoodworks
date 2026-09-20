import { cn } from "@/lib/utils";
import { ALL_CATEGORIES_FILTER, type FilterCategory } from "@/data/products";

interface CategoryFilterProps {
  // Nomes das categorias ativas (vindas do admin) — "Todos" é adicionado
  // automaticamente antes delas.
  categories: string[];
  value: FilterCategory;
  onChange: (category: FilterCategory) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  const options = [ALL_CATEGORIES_FILTER, ...categories];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((category) => (
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
