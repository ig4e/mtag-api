import axios from "axios";
import querystring from "querystring";
import http from "http";
import https from "https";
import { isVideoFile } from "../util";
import axiosRetry from "axios-retry";

const realbooruClient = axios.create({
	baseURL: "https://realbooru.com",
	httpAgent: new http.Agent({ keepAlive: true }),
	httpsAgent: new https.Agent({ keepAlive: true }),
});

axiosRetry(realbooruClient, { retries: 10, retryCondition: () => true });

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

	return (data || []).map((image) => {
		const isVideo = isVideoFile(image.image);

		return {
			id: image.id,
			url: `https://realbooru.com/index.php?page=post&s=view&id=${image.id}`,
			urls: [`https://realbooru.com/images/${image.directory}/${image.image}`],
			category: image.tags,
			aspectRatio: image.width / image.height,
			isVideo,
			wsrvSupport,
		};
	});
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
