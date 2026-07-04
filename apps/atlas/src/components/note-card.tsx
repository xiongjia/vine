import { MapPin } from "lucide-react";
import type { TravelNote } from "../types";

interface NoteCardProps {
  note: TravelNote;
  productCount?: number;
  isActive?: boolean;
  onClick: () => void;
}

const NoteCard = ({ note, productCount, isActive, onClick }: NoteCardProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md p-3 transition-colors ${
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      }`}
    >
      <div className="font-medium text-sm">{note.title}</div>
      <div className="text-xs text-muted-foreground mt-1">{note.date}</div>
      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
        {note.summary}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        {productCount !== undefined && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
            <MapPin className="h-3 w-3" />
            {productCount}
          </span>
        )}
      </div>
    </button>
  );
}

export { NoteCard };
