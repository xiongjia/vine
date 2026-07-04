export interface Product {
  id: string;
  name: string;
  description: string;
  lng: number;
  lat: number;
  image?: string;
  tags: string[];
  noteId?: string;
}

export interface TravelNote {
  id: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
}
