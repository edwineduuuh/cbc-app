"use client";

import LibraryBrowser from "@/components/library/LibraryBrowser";

export default function Page() {
  return (
    <LibraryBrowser kind="pdf"
      title="PDF library"
      intro="Revision notes, worksheets, practice papers and more - filter by grade and learning area."
    />
  );
}
