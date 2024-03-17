import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import { PAGE_SIZE } from "./config";
import * as reddit from "./sources/reddit";
import * as rule34 from "./sources/rule34";
import * as realbooru from "./sources/realbooru";
import * as gelbooru from "./sources/gelbooru";
import * as hanimeTv from "./sources/hanimetv";
import * as pornhub from "./sources/pornhub";

const app = express();
app.use(cors());

app.get(
	"/api/test",
	validateRequest({
		query: z.object({
			page: z.string().default("1:1"),
		}),
	}),
	async (req, res) => {
		const { page = "1:1" } = req.query;

		try {
			const [albumPage, albumIndex] = page.split(":").map(Number);
			const albums = await pornhub.getAlbums({ query: "shemale", page: albumPage });
			const album = await pornhub.getAlbum(albums.data[albumIndex]);

			const nextIndex = albums.data.length > albumIndex + 1 ? albumIndex + 1 : 0;
			const nextPage = nextIndex === 0 ? albumPage + 1 : albumPage;

			res.json({ nextPage: `${nextPage}:${nextIndex}`, albums: { paging: albums.paging, counting: albums.counting }, album });
		} catch (err) {
			res.send((err as Error).message);
		}
	},
);

app.get(
	"/api/images",
	validateRequest({
		query: z.object({
			source: z.enum(["rule34", "reddit", "realbooru", "gelbooru", "hanimetv", "pornhub"]).default("realbooru"),
			page: z.coerce.number().int().default(1),
			mediaType: z.enum(["real", "hentai"]),
			categories: z.string().default("[]"),
			sfw: z.enum(["true", "false"]).default("true"),
			redditAfter: z.string().optional(),
			pornhubPagination: z.string().optional(),
		}),
	}),
	async (req, res) => {
		const {
			source = "reddit",
			mediaType,
			categories: rawCategories = "[]",
			page: rawPage = 1,
			sfw: rawSfw,
			redditAfter: redditAfterRaw = "{}",
			pornhubPagination = "1:1",
		} = req.query;

		try {
			const redditAfter = JSON.parse(redditAfterRaw) as { [index: string]: string };
			const categories = JSON.parse(rawCategories) as string[];
			const page = Number(rawPage!);
			const sfw = rawSfw === "true";
			const isCategoriesEmpty = categories.length < 1;
			const meta = { ...req.query, categories, redditAfter, sfw } as any;
			const pagination = {} as {
				pages?: { next: number | string | null; prev: number | null };
				reddit?: { [index: string]: string };
				pornhubPagination?: string;
			};
			let data: { id: string | number; urls: string[]; category?: string; sub?: string; wsrvSupport: boolean; isVideo?: boolean }[];

			if (source === "rule34") {
				let tags: string[] = mediaType === "real" ? [mediaType] : [];
				if (sfw) tags.push("sfw");
				if (!isCategoriesEmpty) tags = [...tags, ...categories];
				meta.tags = tags;

				data = await rule34.getPostsPage({ limit: PAGE_SIZE, page: page!, tags });
				const isThereNext = data.length > 1;

				pagination.pages = { next: isThereNext ? page + 1 : null, prev: page - 1 };
			} else if (source === "realbooru") {
				let tags: string[] = mediaType === "hentai" ? [mediaType] : [];
				if (sfw) tags.push("sfw");
				if (!isCategoriesEmpty) tags = [...tags, ...categories];
				meta.tags = tags;

				data = await realbooru.getPostsPage({ limit: PAGE_SIZE, page: page, tags });

				const isThereNext = data.length > 1;

				pagination.pages = { next: isThereNext ? page + 1 : null, prev: page - 1 };
			} else if (source === "gelbooru") {
				let tags: string[] = mediaType === "real" ? [mediaType] : [];
				if (sfw) tags.push("sfw");
				if (!isCategoriesEmpty) tags = [...tags, ...categories];
				meta.tags = tags;

				data = await gelbooru.getPostsPage({ limit: PAGE_SIZE, page: page, tags });

				const isThereNext = data.length > 1;

				pagination.pages = { next: isThereNext ? page + 1 : null, prev: page - 1 };
			} else if (source === "hanimetv") {
				let tags: string[] = mediaType === "real" ? ["irl-3d"] : sfw ? ["media"] : [];
				if (!isCategoriesEmpty) tags = [...tags, ...categories];
				if (isCategoriesEmpty && !sfw) tags.push("nsfw-general");
				meta.tags = tags;

				data = await hanimeTv.getPostsPage({ limit: PAGE_SIZE, page: page, tags: tags as any });

				const isThereNext = data.length > 1;

				pagination.pages = { next: isThereNext ? page + 1 : null, prev: page - 1 };
			} else if (source === "reddit") {
				const sub =
					categories.length > 0 ? reddit.getSub({ subs: categories }) : reddit.getSub({ mediaType: sfw ? "sfw" : mediaType });
				const images = await reddit.getPostsPage({ limit: PAGE_SIZE, name: redditAfter[sub], sub: sub });

				pagination.reddit = { ...redditAfter, [sub]: images[images.length - 1].name };
				data = images;
			} else if (source === "pornhub") {
				const [albumPage, albumIndex] = pornhubPagination.split(":").map(Number);
				const albums = await pornhub.getAlbums({ query: `${categories.join(" ")}${sfw ? " sfw" : ""}`, page: albumPage });
				const album = await pornhub.getAlbum(albums.data[albumIndex]);

				const nextIndex = albums.data.length > albumIndex + 1 ? albumIndex + 1 : 0;
				const nextPage = nextIndex === 0 && !albums.paging.isEnd ? albumPage + 1 : albumPage;

				data = album;

				const isThereNext = data.length >= 1;
				pagination.pornhubPagination = isThereNext ? `${nextPage}:${nextIndex}` : undefined;
			}

			return res.json({ meta, data: data!, pagination });
		} catch (err) {
			res.status(500).json({ error: (err as Error).message });
		}
	},
);

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
