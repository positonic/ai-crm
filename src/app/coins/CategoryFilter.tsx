import { Select } from "@mantine/core";

interface Category {
  id: string;
  name: string;
  _count: {
    geckoCoins: number;
    sponsors: number;
  };
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  setSelectedCategory: (value: string | null) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  setSelectedCategory,
}: CategoryFilterProps) {
  return (
    <Select
      label="Filter by Category"
      placeholder="All categories"
      value={selectedCategory}
      onChange={setSelectedCategory}
      data={categories.map((cat) => ({
        value: cat.name,
        label: `${cat.name} (${cat._count.geckoCoins})`,
      }))}
      clearable
      style={{ minWidth: 240 }}
    />
  );
}
