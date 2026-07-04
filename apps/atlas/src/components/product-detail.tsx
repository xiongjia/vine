import { X } from "lucide-react";
import type { Product, TravelNote } from "../types";

interface ProductDetailProps {
  product: Product;
  note?: TravelNote;
  onClose: () => void;
}

const ProductDetail = ({ product, note, onClose }: ProductDetailProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <button
          onClick={onClose}
          className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>

      <p className="text-sm text-muted-foreground">{product.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {product.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        📍 {product.lat.toFixed(4)}, {product.lng.toFixed(4)}
      </div>

      {note && (
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground mb-1">来自笔记</div>
          <div className="text-sm font-medium">{note.title}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {note.date} · {note.summary}
          </div>
        </div>
      )}
    </div>
  );
}

export { ProductDetail };
