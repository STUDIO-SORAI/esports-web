export interface Post {
  id: string;
  slug: string;
  title: string;
  description?: string;
  content?: string;
  body?: string;
  rawContent?: string;
  coverImage?: string;
  ogImage?: string;
  category?: string;
  categorySlug?: string;
  tags?: string | string[];
  authors?: string | string[];
  publishedAt?: string;
  updatedAt?: string;
  wordCount?: number;
  status?: string;
}

export interface Author {
  id: string;
  name: string;
  headline?: string;
  image?: string;
  bio?: string;
  contactEmail?: string;
  socials?: {
    twitter?: string;
    threads?: string;
    instagram?: string;
    twitch?: string;
    youtube?: string;
    website?: string;
  };
}

export interface PostsResponse {
  posts: Post[];
}

export interface AuthorsResponse {
  authors: Author[];
}

export interface PostResponse {
  post: Post;
}

export interface Submission {
  id: number;
  name: string;
  email: string;
  title: string;
  content: string;
  category: string | null;
  status: "pending" | "reviewing" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface Category {
  name: string;
  slug: string;
  navOrder: number;
  showInNav: boolean;
}

export interface Brief {
  id: string;
  slug: string;
  title: string;
  body: string;
  image: string;
  /** 原圖尺寸，用來預留版位並保留原比例；取不到時為 0 */
  imageWidth?: number;
  imageHeight?: number;
  category?: string;
  categorySlug?: string;
  tags: string[];
  authorIds: string[];
  authorNames: string[];
  authorImages: string[];
  publishedAt?: string;
  updatedAt?: string;
  source?: string;
}
