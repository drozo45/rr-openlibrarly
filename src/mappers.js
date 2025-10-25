export function mapAuthorResult(doc) {
  return {
    id: doc?.key?.replace('/authors/', '') || null,
    name: doc?.name || null,
    birth_date: doc?.birth_date || null,
    top_work: doc?.top_work || null,
    work_count: doc?.work_count || 0,
  };
}

export function seriesFromSubjects(subjects = []) {
  const s = subjects.find((x) => /series/i.test(x));
  return s || null;
}

export function mapWorkSummary(entry) {
  const workKey = entry?.key?.replace('/works/', '') || null;
  const firstPublish = entry?.first_publish_date || entry?.first_publish_year || null;
  const coverId = entry?.covers?.[0] || null;

  return {
    id: workKey,
    title: entry?.title || null,
    authors: (entry?.authors || []).map((a) => a?.author?.key?.replace('/authors/', '')),
    first_publish_date: firstPublish,
    subjects: entry?.subjects || [],
    series: seriesFromSubjects(entry?.subjects || []),
    cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
  };
}

export function mapWorkDetail(work, editions) {
  const workKey = work?.key?.replace('/works/', '') || null;
  const coverId = (work?.covers || [])[0] || null;

  const isbns = new Set();
  for (const ed of editions) {
    (ed.isbn_10 || []).forEach((x) => isbns.add(x));
    (ed.isbn_13 || []).forEach((x) => isbns.add(x));
  }

  return {
    id: workKey,
    title: work?.title || null,
    description: typeof work?.description === 'string' ? work.description : work?.description?.value || null,
    subjects: work?.subjects || [],
    series: seriesFromSubjects(work?.subjects || []),
    authors: (work?.authors || []).map((a) => a?.author?.key?.replace('/authors/', '')),
    identifiers: {
      isbn: Array.from(isbns),
      openlibrary: workKey,
    },
    cover_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
  };
}
