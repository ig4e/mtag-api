import cors from "cors";
import "dotenv/config";
import express from "express";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import { PAGE_SIZE } from "./config";
import * as reddit from "./sources/reddit";
import * as rule34 from "./sources/rule34";
const app = express();
app.use(cors());

app.get(
	"/api/images",
	validateRequest({
		query: z.object({
			source: z.enum(["rule34", "reddit"]).default("reddit"),
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
			const pagination = {} as { pages?: { next: number; prev: number }; reddit?: { [index: string]: string } };
			let data: { id: string | number; urls: string[]; category?: string; sub?: string; wsrvSupport: boolean }[];

			if (source === "rule34" && !sfw) {
				let tags: string[] = mediaType === "real" ? [mediaType] : [];
				if (!isCategoriesEmpty) tags = [...tags, ...categories];
				meta.tags = tags;

				data = await rule34.getPostsPage({ limit: PAGE_SIZE, page: page!, tags });
				pagination.pages = { next: page + 1, prev: page - 1 };
			} else if (source === "reddit" || sfw) {
				const sub = reddit.getSub({ mediaType: sfw ? "sfw" : mediaType });
				const images = await reddit.getPostsPage({ limit: PAGE_SIZE, name: redditAfter[sub], sub: sub });

				pagination.reddit = { ...redditAfter, [sub]: images[images.length - 1].name };
				data = images;
			}

			return res.json({ meta, data: data!, pagination });
		} catch (err) {
			res.status(400).json({ error: (err as Error).message });
		}
	},
);

app.get("/api/mock/images", (req, res) => {
	const mockCategories = ["vanila", "yuri", "bdsm", "trap"];

	const {
		page: pageString,
		mediaType,
		category,
		sfw: sfwString,
	} = req.query as { page: string; mediaType: string; category: string; sfw: string };

	const page = Number(pageString);
	const sfw = Boolean(sfwString);

	if (!page || !mediaType || !category || !sfw) {
		return res.status(400).send("Missing required query parameters");
	}

	const mocks = [
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/9579b9b82b09747da81f2e9f4c8e3b25-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/845c44e3fb015b0b8df87d3d2a04e2d3-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/d239dbe640e1b5351d7d58035b0097d3-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/613acb591486c3e54ab59506f6c20cda-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/845c44e3fb015b0b8df87d3d2a04e2d3-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/d239dbe640e1b5351d7d58035b0097d3-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/613acb591486c3e54ab59506f6c20cda-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/845c44e3fb015b0b8df87d3d2a04e2d3-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/d239dbe640e1b5351d7d58035b0097d3-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
		{
			id: crypto.randomUUID(),
			url: "https://cdn.gilcdn.com/ContentMediaGenericFiles/613acb591486c3e54ab59506f6c20cda-Full.webp",
			category: mockCategories[Math.floor(Math.random() * mockCategories.length)],
		},
	];

	res.json({
		images: mocks,
		pagination: {
			nextPage: page + 1,
			prevPage: page - 1,
		},
	});
});

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
