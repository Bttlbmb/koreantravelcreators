async function loadData() {
  const res = await fetch('data/creators.json'); // relative to <base>
  return await res.json();
}
