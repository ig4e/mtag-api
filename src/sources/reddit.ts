import type GotScrapingModule from "got-scraping";

let gotScraping: GotScrapingModule.GotScraping;

export async function importEsmModule<T>(name: string): Promise<T> {
	const module = eval(`(async () => {return await import("${name}")})()`);
	return module as T;
}

async function fetchWithGotScraping(url: string, options: GotScrapingModule.ExtendedOptionsOfTextResponseBody) {
	gotScraping ??= (await importEsmModule<typeof GotScrapingModule>("got-scraping")).gotScraping;
	return gotScraping(url, {
		...options,
		proxyUrl: "http://sekaidev-rotate:fxcbk0esu9pl@p.webshare.io:80",
	});
}

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
	const { body } = await fetchWithGotScraping(`https://www.reddit.com/r/${sub}.json?after=${name}`, {
		responseType: "json" as any,
	});

	const data = body as {
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
	};

	const posts = data.data.children
		.filter((post) => {
			return post.kind === "t3" && (post.data.preview?.images?.length || 0) > 0;
		})
		.map((post) => {
			const images = post.data.preview.images!.filter((image) => !image.source.url.includes("external"));
			const imageAspectRatio = images[0]?.source.width / images[0]?.source.height;

			return {
				id: post.data.name,
				name: post.data.name,
				urls: images.map((image) => getImgSrc(image.source.url)) || [],
				aspectRatio: imageAspectRatio,
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
