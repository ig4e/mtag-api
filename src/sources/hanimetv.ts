import axios from "axios";
import axiosRetry from "axios-retry";
import http from "http";
import https from "https";
import querystring from "querystring";
import { isVideoFile } from "../util";

const hanimeTvClient = axios.create({
	baseURL: "https://community-uploads.highwinds-cdn.com/api/v9",
	httpAgent: new http.Agent({ keepAlive: true }),
	httpsAgent: new https.Agent({ keepAlive: true }),
});

axiosRetry(hanimeTvClient, { retries: 10, retryCondition: () => true });

const wsrvSupport = false;

export async function getPostsPage({
	page,
	limit,
	tags,
}: {
	page: number;
	limit: number;
	tags: ("media" | "nsfw-general" | "furry" | "futa" | "yaoi" | "yuri" | "traps" | "irl-3d")[];
}) {
	const { data } = await hanimeTvClient.get<{
		meta: {
			total: number;
			offset: number;
			count: number;
			error: null | string;
		};
		data: {
			id: number;
			channel_name: string;
			username: string;
			url: string;
			proxy_url: string;
			extension: string;
			width: number;
			height: number;
			filesize: number;
			created_at_unix: number;
			updated_at_unix: number;
			discord_user_id: string;
			user_avatar_url: string;
			canonical_url: string;
		}[];
	}>(
		"/community_uploads?" +
			querystring.stringify({
				"channel_name__in[]": tags,
				query_method: "offset",
				__offset: (page - 1) * limit,
				loc: "https://hanime.tv",
			}),
	);

	return (data.data || []).map((image) => {
		const isVideo = isVideoFile(image.extension);

		return {
			id: image.id,
			url: `https://hanime.tv/browse/images`,
			urls: [`https://i1.wp.com/${image.proxy_url.replace("https://", "")}?h=200`],
			category: image.channel_name,
			aspectRatio: image.width / image.height,
			isVideo,
			wsrvSupport,
		};
	});
}
