import { Newsletter } from "../models/Newsletter";
import type {
  BulkDeleteNewslettersData,
  GetNewslettersQuery,
  SubscribeNewsletterData,
} from "../types/newsletter.types";
import APIFeature from "../utils/APIFeature";

class NewsletterService {
  async subscribe(data: SubscribeNewsletterData) {
    const email = data.email.trim().toLowerCase();
    const source = data.source ?? "coming-soon";

    const existing = await Newsletter.findOne({ email });

    if (existing) {
      return existing;
    }

    return Newsletter.create({ email, source });
  }

  async getNewsletters(query: GetNewslettersQuery) {
    const result = await new APIFeature(Newsletter, query, {
      pagination: {
        defaultLimit: 20,
      },
      sort: {
        defaultSort: "-createdAt",
      },
      search: {
        searchFields: ["email"],
      },
      filterFields: ["source"],
    }).execute();

    return {
      items: result.data,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.pages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    };
  }

  async deleteNewsletter(id: string) {
    const deleted = await Newsletter.findByIdAndDelete(id);

    if (!deleted) {
      return null;
    }

    return deleted;
  }

  async bulkDeleteNewsletters(data: BulkDeleteNewslettersData) {
    const result = await Newsletter.deleteMany({
      _id: { $in: data.ids },
    });

    return {
      deletedCount: result.deletedCount ?? 0,
    };
  }
}

export default new NewsletterService();
