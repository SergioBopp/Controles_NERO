const FAVORITES_KEY = "nero_bdi_favorites_v1";

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function listarFavoritosBDI() {
  return readFavorites();
}

export function isFavoritoBDI(id) {
  if (!id) return false;

  const favoritos = readFavorites();

  return favoritos.includes(id);
}

export function toggleFavoritoBDI(id) {
  if (!id) return false;

  const favoritos = readFavorites();

  if (favoritos.includes(id)) {
    const updated = favoritos.filter((item) => item !== id);
    writeFavorites(updated);

    return false;
  }

  const updated = [...favoritos, id];
  writeFavorites(updated);

  return true;
}
