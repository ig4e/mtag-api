import axios from "axios";
import querystring from "querystring";

const realbooruClient = axios.create({
	baseURL: "https://realbooru.com",
});

const wsrvSupport = false;

export async function getPostsPage({ page, limit, tags }: { page: number; limit: number; tags: string[] }) {
	const { data } = await realbooruClient.get<
		{
			directory: string;
			hash: string;
			height: number;
			id: number;
			image: string;
			change: number;
			owner: string;
			parent_id: number;
			rating: string;
			sample: number;
			sample_height: number;
			sample_width: number;
			score: number;
			tags: string;
			width: number;
		}[]
	>(
		"/index.php?" +
			querystring.stringify({
				page: "dapi",
				s: "post",
				q: "index",
				limit: limit,
				pid: page,
				json: 1,
			}) +
			`&tags=${tags.join("+")}`,
	);

	return (data || []).map((image) => ({
		id: image.id,
		urls: [`https://realbooru.com//images/${image.directory}/${image.image}`],
		category: image.tags,
		aspectRatio: image.width / image.height,
		wsrvSupport,
	}));
}

export async function getTagsPage({ page, limit }: { page: number; limit: number }) {
	const { data } = await realbooruClient.get(
		"/index.php?" +
			querystring.stringify({
				page: "dapi",
				s: "tag",
				q: "index",
				limit: limit,
				pid: page,
				json: 1,
			}),
	);

	return data;
}
