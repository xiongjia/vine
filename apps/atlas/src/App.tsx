import { useState, useMemo } from "react";
import { SidebarProvider, SidebarAside, ThemeToggle } from "@vine/ui";
import { MapPin, BookOpen } from "lucide-react";
import { AtlasMap } from "./components/atlas-map";
import { ProductDetail } from "./components/product-detail";
import { NoteCard } from "./components/note-card";
import type { Product, TravelNote } from "./types";
import productsData from "./data/products.json";
import notesData from "./data/notes.json";

const App = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const products: Product[] = productsData;
  const notes: TravelNote[] = notesData;

  // Filter products by active note
  const filteredProducts = useMemo(
    () =>
      activeNoteId
        ? products.filter((p) => p.noteId === activeNoteId)
        : products,
    [activeNoteId, products],
  );

  // Count products per note
  const productCountByNote = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.noteId) counts[p.noteId] = (counts[p.noteId] ?? 0) + 1;
    });
    return counts;
  }, [products]);

  // Find note for selected product
  const selectedProductNote = useMemo(
    () =>
      selectedProduct?.noteId
        ? notes.find((n) => n.id === selectedProduct.noteId)
        : undefined,
    [selectedProduct, notes],
  );

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) ?? null,
    [activeNoteId, notes],
  );

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Sidebar */}
        <SidebarAside className="flex flex-col">
          <div className="flex items-center justify-between px-3 py-4 border-b">
            <h1 className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Atlas
            </h1>
            <ThemeToggle />
          </div>

          {/* Note filter */}
          <div className="px-3 py-3 border-b">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <BookOpen className="h-3.5 w-3.5" />
              旅游笔记
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveNoteId(null)}
                className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                  activeNoteId === null
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/50"
                }`}
              >
                全部商品 ({products.length})
              </button>
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  productCount={productCountByNote[note.id] ?? 0}
                  isActive={activeNoteId === note.id}
                  onClick={() => setActiveNoteId(note.id)}
                />
              ))}
            </div>
          </div>

          {/* Selected product info */}
          {selectedProduct && (
            <div className="px-3 py-3 border-t overflow-auto flex-1">
              <ProductDetail
                product={selectedProduct}
                note={selectedProductNote}
                onClose={() => setSelectedProduct(null)}
              />
            </div>
          )}
        </SidebarAside>

        {/* Map */}
        <main className="flex-1 relative">
          <AtlasMap
            products={filteredProducts}
            onProductSelect={setSelectedProduct}
            className="absolute inset-0"
          />

          {/* Active note indicator */}
          {activeNote && (
            <div className="absolute top-4 left-4 z-10 rounded-md bg-background/90 backdrop-blur px-3 py-2 shadow text-sm">
              📓 {activeNote.title}
              <button
                onClick={() => setActiveNoteId(null)}
                className="ml-2 text-xs text-muted-foreground hover:text-foreground"
              >
                清除筛选
              </button>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}

export default App;
