import axios from "axios";
const redditClient = axios.create({
	baseURL: "https://www.reddit.com/",
	proxy: {
		protocol: "http",
		host: "p.webshare.io",
		port: 80,
		auth: {
			username: "sekaidev-rotate",
			password: "fxcbk0esu9pl",
		},
	},
});

const wsrvSupport = true;

const sfwSubs = [
	"ArianaGrandeLewd",
	"femboy",
	"RealGirls_SFW",
	"Hentai_SFW",
	"gymgirlsSFW",
	"OpenShirtSFW",
	"Bikini_BabesSFW",
	"Nekomimi",
	"CuteAsianGirlsSFW",
	"sfwpetite",
	"SFW_CF_BoobsTogether",
	"SFWsoftcore",
	"SFWButts",
	"CatgirlSFW",
	"SFWcurvy",
	"ClothedForPrejacs",
	"GirlsfrontlineSFW",
];
const realSubs = ["thighhighs", "boobs", "SchoolGirlSkirts", "ThickThighs", "Nudes", "BustyPetite", "PUBLICNUDITY"];
const hentaiSubs = ["hentai", "FemboyHentai", "FemboysAndHentai", "CuteTraps", "fubukiNSFW"];

export type RedditImage = {
	url: string;
	width: number;
	height: number;
};

export function getSub({ mediaType }: { mediaType: "hentai" | "real" | "sfw" }): string {
	if (mediaType === "real") {
		return realSubs[Math.floor(Math.random() * realSubs.length)];
	} else if (mediaType === "hentai") {
		return hentaiSubs[Math.floor(Math.random() * hentaiSubs.length)];
	} else if (mediaType === "sfw") {
		return sfwSubs[Math.floor(Math.random() * sfwSubs.length)];
	}

	return "";
}

export async function getPostsPage({ name, limit, sub }: { name?: string; limit: number; sub: string }) {
	const { data } = await redditClient.get<{
		data: {
			children: {
				kind: string;
				data: {
					name: string;
					thumbnail: string;
					preview: {
						images?: {
							source: RedditImage;
							resolutions: RedditImage[];
						}[];
						reddit_video_preview?: {
							bitrate_kbps: number;
							fallback_url: string;
							height: number;
							width: number;
							scrubber_media_url: string;
							dash_url: string;
							duration: number;
							hls_url: string;
							is_gif: boolean;
							transcoding_status: "completed";
						};
					};
				};
			}[];
		};
	}>(`/r/${sub}.json?after=${name}`);

	const posts = data.data.children
		.filter((post) => {
			return post.kind === "t3" && post.data.preview?.images;
		})
		.map((post) => {
			const images = post.data.preview.images!.filter((image) => !image.source.url.includes("external"));

			return {
				id: post.data.name,
				name: post.data.name,
				urls: images.map((image) => getImgSrc(image.resolutions[image.resolutions.length - 1].url)) || [],
				wsrvSupport: wsrvSupport,
				sub,
			};
		})
		.filter((img) => img.urls.length > 0);

	return posts.slice(0, limit);
}

function getImgSrc(url: string) {
	return url.replace("preview", "i");
}
