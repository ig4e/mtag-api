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

const app = express();
app.use(cors());

app.get(
	"/api/images",
	validateRequest({
		query: z.object({
			source: z.enum(["rule34", "reddit", "realbooru", "gelbooru", "hanimetv"]).default("realbooru"),
			page: z.coerce.number().int().default(1),
			mediaType: z.enum(["real", "hentai"]),
			categories: z.string().default("[]"),
			sfw: z.enum(["true", "false"]).default("true"),
			redditAfter: z.string().optional(),
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
		} = req.query;

		try {
			const redditAfter = JSON.parse(redditAfterRaw) as { [index: string]: string };
			const categories = JSON.parse(rawCategories) as string[];
			const page = Number(rawPage!);
			const sfw = rawSfw === "true";
			const isCategoriesEmpty = categories.length < 1;
			const meta = { ...req.query, categories, redditAfter, sfw } as any;
			const pagination = {} as { pages?: { next: number | null; prev: number }; reddit?: { [index: string]: string } };
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
				let tags: string[] = mediaType === "real" ? ["irl-3d"] : [sfw ? "media" : "nsfw-general"];
				if (!isCategoriesEmpty) tags = [...tags, ...categories];
				meta.tags = tags;

				data = await hanimeTv.getPostsPage({ limit: PAGE_SIZE, page: page, tags: tags as any });

				const isThereNext = data.length > 1;

				pagination.pages = { next: isThereNext ? page + 1 : null, prev: page - 1 };
			} else if (source === "reddit") {
				const sub = reddit.getSub({ mediaType: sfw ? "sfw" : mediaType });
				const images = await reddit.getPostsPage({ limit: PAGE_SIZE, name: redditAfter[sub], sub: sub });

				pagination.reddit = { ...redditAfter, [sub]: images[images.length - 1].name };
				data = images;
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
