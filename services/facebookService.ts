
import { Product, ProductSet, NewProduct } from '../types';
import { Logger } from './loggingService';

const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

interface BatchRequest {
    method: 'GET' | 'POST' | 'DELETE';
    relative_url: string;
    body?: string;
    name?: string;
    depends_on?: string;
}

class FacebookCatalogService {
  private apiToken: string;
  private catalogId: string;
  private logger?: Logger;

  constructor(apiToken: string, catalogId: string, logger?: Logger) {
    if (!apiToken || !catalogId) {
      throw new Error("API Token and Catalog ID are required.");
    }
    this.apiToken = apiToken;
    this.catalogId = catalogId;
    this.logger = logger;
  }

  private async apiRequest(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: object) {
    const url = new URL(`${BASE_URL}${path}`);
    const headers: HeadersInit = { 'Authorization': `Bearer ${this.apiToken}` };
    const options: RequestInit = { method, headers };

    if (method !== 'GET' && body) {
        if (body instanceof URLSearchParams) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.body = body;
        } else {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }
    
    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Facebook API Error:', errorData);
      throw new Error(errorData.error?.message || 'An unknown API error occurred.');
    }

    return response.json();
  }
  
   private async batchRequest(requests: BatchRequest[], isItemsBatch = false) {
    const url = isItemsBatch
        ? new URL(`${BASE_URL}/${this.catalogId}/items_batch`)
        : new URL(BASE_URL);

    const formData = new FormData();
    formData.append('access_token', this.apiToken);
    
    if (isItemsBatch) {
        formData.append('item_type', 'PRODUCT_ITEM');
        formData.append('requests', JSON.stringify(requests));
    } else {
        formData.append('batch', JSON.stringify(requests));
    }

    const response = await fetch(url.toString(), { method: 'POST', body: formData });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error('Facebook Batch API Error:', errorData);
        throw new Error(errorData.error?.message || 'An unknown batch API error occurred.');
    }
    
    return response.json();
  }

  private parseErrors(errors: any): string[] {
      if (!errors || !errors.data || !Array.isArray(errors.data)) {
          return [];
      }
      return errors.data.map((error: any) => error.error_message || error.description || 'No description provided.').filter(Boolean);
  }

  async getProducts(): Promise<Product[]> {
    this.logger?.info("Fetching all products from catalog (with pagination)...");
    let allProductsData: any[] = [];
    let nextUrl: string | null = `${BASE_URL}/${this.catalogId}/products?fields=id,retailer_id,name,description,brand,url,price,currency,image_url,inventory,review_status,errors&limit=100`;

    try {
        const headers: HeadersInit = { 'Authorization': `Bearer ${this.apiToken}` };

        while (nextUrl) {
            const urlToFetch = new URL(nextUrl);
            urlToFetch.searchParams.append('_', Date.now().toString());
            urlToFetch.searchParams.delete('access_token');
            
            const response = await fetch(urlToFetch.toString(), { headers });
            if (!response.ok) throw new Error((await response.json()).error?.message || 'Pagination error');
            const responseData = await response.json();

            if (responseData.data) allProductsData = allProductsData.concat(responseData.data);
            nextUrl = responseData.paging?.next || null;
        }
        
        const products: Product[] = allProductsData.map((p: any) => ({
            id: p.id,
            retailer_id: p.retailer_id,
            name: p.name,
            description: p.description,
            brand: p.brand,
            link: p.url,
            price: parseFloat(p.price) / 100,
            currency: p.currency,
            imageUrl: p.image_url,
            inventory: p.inventory || 0,
            reviewStatus: p.review_status || 'pending',
            rejectionReasons: this.parseErrors(p.errors),
        }));
        
        this.logger?.success(`Successfully fetched a total of ${products.length} products.`);
        return products;
    } catch (error) {
        this.logger?.error("Failed to fetch products", error);
        throw error;
    }
  }

  async addProducts(newProducts: NewProduct[]): Promise<any> {
     if (newProducts.length === 0) return [];
     this.logger?.info(`Attempting to add ${newProducts.length} product(s) via items_batch...`);
     
     const requests = newProducts.map(p => ({
        method: 'UPDATE', // Using UPDATE as it works for creation too (upsert)
        retailer_id: p.retailer_id,
        data: {
            name: p.name,
            description: p.description,
            brand: p.brand,
            url: p.link,
            price: String(Math.round(p.price * 100)),
            currency: p.currency,
            image_url: p.imageUrl,
            availability: p.inventory > 0 ? 'in stock' : 'out of stock',
            inventory: String(p.inventory),
            condition: 'new',
        }
     }));
     
     try {
        const response = await this.batchRequest(requests as any, true);
        if (response.handles) {
            this.logger?.success(`Successfully submitted batch request to add ${newProducts.length} product(s).`);
            return response;
        } else {
             throw new Error('items_batch did not return handles for tracking.');
        }
    } catch (error) {
        this.logger?.error("Failed to add products batch", error);
        throw error;
    }
  }

  async deleteProducts(productIds: string[]): Promise<any> {
    if (productIds.length === 0) return [];
    this.logger?.info(`Attempting to delete ${productIds.length} product(s) via items_batch...`);
    const requests = productIds.map(id => ({
        method: 'DELETE',
        retailer_id: id, // For items_batch, we use retailer_id, assuming it's the product ID here.
    }));
    
    try {
        const response = await this.batchRequest(requests as any, true);
        if (response.handles) {
            this.logger?.success(`Successfully submitted batch request to delete ${productIds.length} product(s).`);
            return response;
        } else {
            throw new Error('items_batch did not return handles for tracking.');
        }
    } catch (error) {
        this.logger?.error("Failed to delete products batch", error);
        throw error;
    }
  }
  
  async refreshProductsStatus(productIds: string[]): Promise<Map<string, { reviewStatus: 'approved' | 'pending' | 'rejected'; rejectionReasons?: string[] }>> {
    if (productIds.length === 0) return new Map();
    this.logger?.info(`Refreshing statuses for ${productIds.length} product(s) via individual requests...`);

    try {
        const promises = productIds.map(id => 
            this.apiRequest(`/${id}?fields=review_status,errors,updated_time&_=${Date.now()}`)
        );
        
        const results = await Promise.all(promises);
        const statusMap = new Map<string, { reviewStatus: 'approved' | 'pending' | 'rejected'; rejectionReasons?: string[] }>();
        
        results.forEach((body: any) => {
            if (body && body.id) {
                statusMap.set(body.id, {
                    reviewStatus: body.review_status || 'pending',
                    rejectionReasons: this.parseErrors(body.errors),
                });
            }
        });

        this.logger?.success(`Successfully refreshed statuses for ${statusMap.size} product(s).`);
        return statusMap;
    } catch (error) {
        this.logger?.error("Failed to refresh product statuses", error);
        throw error;
    }
  }

  async getSets(): Promise<ProductSet[]> {
    this.logger?.info("Fetching product sets...");
    try {
        const setsResponse = await this.apiRequest(`/${this.catalogId}/product_sets?fields=id,name`);
        const basicSets: {id: string, name: string}[] = setsResponse.data || [];
        if (basicSets.length === 0) return [];

        const batchRequests: BatchRequest[] = basicSets.map(set => ({
            method: 'GET',
            relative_url: `${set.id}/products?fields=id&limit=5000`
        }));

        this.logger?.info(`Fetching products for ${basicSets.length} set(s)...`);
        const batchResponses = await this.batchRequest(batchRequests);

        const setsWithProducts: ProductSet[] = basicSets.map((set, index) => {
            const response = batchResponses[index];
            let productIds: string[] = [];
            if (response?.code === 200) {
                try {
                    const body = JSON.parse(response.body);
                    if (body.data) productIds = body.data.map((p: any) => p.id);
                } catch (e) { /* ignore parse error */ }
            }
            return { id: set.id, name: set.name, productIds };
        });
        
        this.logger?.success(`Successfully fetched ${setsWithProducts.length} product sets.`);
        return setsWithProducts;

    } catch (error) {
        this.logger?.error("Failed to fetch product sets", error);
        throw error;
    }
  }

  async createSet(name: string, productIds: string[]): Promise<ProductSet> {
    this.logger?.info(`Creating new product set "${name}"...`);
    try {
        const payload = { name, filter: { product_item_id: { is_any: productIds } } };
        const newSetResponse = await this.apiRequest(`/${this.catalogId}/product_sets`, 'POST', payload);
        this.logger?.success(`Successfully created set "${name}".`);
        return { id: newSetResponse.id, name, productIds };
    } catch(error) {
        this.logger?.error(`Failed to create set "${name}"`, error);
        throw error;
    }
  }

  async deleteSets(setIds: string[]): Promise<any> {
    if (setIds.length === 0) return [];
    this.logger?.info(`Attempting to delete ${setIds.length} set(s)...`);
    const requests: BatchRequest[] = setIds.map(id => ({ method: 'DELETE', relative_url: id }));
    try {
        await this.batchRequest(requests);
        this.logger?.success(`Successfully submitted batch request to delete ${setIds.length} set(s).`);
    } catch(error) {
        this.logger?.error("Failed to delete sets batch", error);
        throw error;
    }
  }
  
  async updateSet(setId: string, name: string, productIds: string[]): Promise<ProductSet> {
    this.logger?.info(`Updating set "${name}" (ID: ${setId})...`);
    try {
        const payload = { name, filter: { product_item_id: { is_any: productIds } } };
        await this.apiRequest(`/${setId}`, 'POST', payload);
        this.logger?.success(`Successfully updated set "${name}".`);
        return { id: setId, name, productIds };
    } catch(error) {
        this.logger?.error(`Failed to update set "${name}"`, error);
        throw error;
    }
  }
}

export default FacebookCatalogService;