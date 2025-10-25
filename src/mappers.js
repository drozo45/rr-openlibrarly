export function toReadarrAuthorDoc(doc){
  const id = (doc.key||'').replace('/authors/',''); // OLxxxxxA
  return {
    authorMetadataId: id,
    name: doc.name || null,
    sortName: doc.name || null,
    disambiguation: doc.top_work || null,
    overview: null,
    images: [],
    links: [],
    ratings: { value: null, votes: null },
    workCount: doc.work_count || 0,
    provider: 'openlibrary'
  };
}

export function toReadarrAuthor(doc){ return toReadarrAuthorDoc(doc); }

export function toReadarrBook(authorId){
  return function(entry){
    const workId = (entry.key||'').replace('/works/',''); // OLxxxxxW
    const coverId = (entry.covers||[])[0];
    const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
    const date = entry.first_publish_date || entry.first_publish_year || null;

    return {
      foreignId: workId,
      title: entry.title || null,
      authorMetadataId: authorId,
      seriesTitle: inferSeries(entry.subjects),
      releaseDate: date ? String(date) : null,
      genres: entry.subjects || [],
      remoteCover: coverUrl,
      links: [],
      provider: 'openlibrary'
    };
  }
}

export function toReadarrBookDetail(work, editions){
  const workId = (work.key||'').replace('/works/','');
  const coverId = (work.covers||[])[0];
  const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
  const subjects = work.subjects || [];
  const overview = normalizeDesc(work.description);

  const isbns = new Set();
  for (const ed of editions){
    (ed.isbn_10||[]).forEach(x=>isbns.add(x));
    (ed.isbn_13||[]).forEach(x=>isbns.add(x));
  }

  return {
    foreignId: workId,
    title: work.title || null,
    seriesTitle: inferSeries(subjects),
    overview,
    genres: subjects,
    remoteCover: coverUrl,
    identifiers: {
      isbn: Array.from(isbns),
      openlibrary: workId
    },
    links: [],
    provider: 'openlibrary'
  };
}

function normalizeDesc(d){
  if(!d) return null;
  if(typeof d==='string') return d;
  if(typeof d==='object' && d.value) return d.value;
  return null;
}

function inferSeries(subjects){
  if(!Array.isArray(subjects)) return null;
  const hit = subjects.find(s=>/series/i.test(String(s)));
  return hit || null;
}
