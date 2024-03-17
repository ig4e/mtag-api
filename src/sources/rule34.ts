import axios from "axios";
import querystring from "querystring";
import axiosRetry from "axios-retry";
import http from "http";
import https from "https";
import { isVideoFile } from "../util";

const rule34Client = axios.create({
	baseURL: "https://api.rule34.xxx",
	httpAgent: new http.Agent({ keepAlive: true }),
	httpsAgent: new https.Agent({ keepAlive: true }),
});

axiosRetry(rule34Client, { retries: 10, retryCondition: () => true });

const wsrvSupport = false;

export async function getPostsPage({ page, limit, tags }: { page: number; limit: number; tags: string[] }) {
	const { data } = await rule34Client.get<
		{
			preview_url: string;
			sample_url: string;
			file_url: string;
			directory: number;
			hash: string;
			width: number;
			height: number;
			id: number;
			image: string;
			change: number;
			owner: string;
			parent_id: number;
			rating: string;
			sample: boolean;
			sample_height: number;
			sample_width: number;
			score: number;
			tags: string;
			source: string;
			status: string;
			has_notes: boolean;
			comment_count: number;
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
		url: `https://rule34.xxx/index.php?page=post&s=view&id=${image.id}`,
		urls: [image.file_url],
		category: image.tags.replace(/ /g, ","),
		aspectRatio: image.width / image.height,
		isVideo: isVideoFile(image.file_url),
		wsrvSupport,
	}));
}

export async function getTagsPage({ page, limit }: { page: number; limit: number }) {
	const { data } = await rule34Client.get(
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
