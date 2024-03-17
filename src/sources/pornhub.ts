import { PornHub } from "pornhub.js";
import { isVideoFile } from "../util";
const client = new PornHub();

const wsrvSupport = false;

export async function getAlbums({ query, page }: { query: string; page?: number }) {
	const albums = await client.searchAlbum(query, { order: "Most Recent", page });

	return albums;
}

export async function getAlbum({ url }: { url: string }) {
	const album = await client.album(url);

	return album.photos.map((image) => {
		const isVideo = isVideoFile(image.url);

		return {
			id: image.url,
			url: image.url,
			urls: [image.preview],
			category: album.tags.join(","),
			aspectRatio: undefined,
			isVideo,
			wsrvSupport,
		};
	});
}
