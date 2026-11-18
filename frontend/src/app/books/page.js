"use client";

import LibraryBrowser from "@/components/library/LibraryBrowser";

export default function Page() {
  return (
    <LibraryBrowser kind="book"
      title="Books"
      intro="Textbooks, revision books and reading for every grade."
    />
  );
}
