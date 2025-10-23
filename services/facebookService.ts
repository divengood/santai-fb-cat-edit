import { Product, ProductSet, NewProduct } from '../types';
import { Logger } from './loggingService';

const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

interface BatchRequest {
    method: 'GET' | 'POST' | 'DELETE';
    relative_url: string;
    body?: string;
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
    url.searchParams.append('access_token', this.apiToken);

    const options: RequestInit = {
      method,
    };

    if (method !== 'GET' && body) {
        options.headers = {'Content-Type': 'application/json'};
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Facebook API Error:', errorData);
      throw new Error(errorData.error?.message || 'An unknown API error occurred.');
    }

    return response.json();
  }
  
   private async batchRequest(requests: BatchRequest[]) {
    const url = new URL(BASE_URL);
    url.searchParams.append('access_token', this.apiToken);
    
    const formData = new FormData();
    formData.append('batch', JSON.stringify(requests));

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error('Facebook Batch API Error:', errorData);
        throw new Error(errorData.error?.message || 'An unknown batch API error occurred.');
    }
    
    return response.json();
  }

  async getProducts(): Promise<Product[]> {
    this.logger?.info("Fetching products from catalog...");
    const path = `/${this.catalogId}/products?fields=id,retailer_id,name,description,brand,url,price,currency,image_url,inventory&limit=500`;
    try {
        const response = await this.apiRequest(path);
        const products: Product[] = response.data.map((p: any) => ({
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
        }));
        this.logger?.success(`Successfully fetched ${products.length} products.`);
        return products;
    } catch(error) {
        this.logger?.error("Failed to fetch products", error);
        throw error;
    }
  }

  async addProducts(newProducts: NewProduct[]): Promise<any> {
     if (newProducts.length === 0) return [];
     this.logger?.info(`Attempting to add ${newProducts.length} product(s)...`);
     const requests: BatchRequest[] = newProducts.map(p => ({
        method: 'POST',
        relative_url: `${this.catalogId}/products`,
        body: new URLSearchParams({
            retailer_id: p.retailer_id,
            name: p.name,
            description: p.description,
            brand: p.brand,
            url: p.link,
            price: String(Math.round(p.price * 100)),
            currency: p.currency,
            image_url: p.imageUrl,
            availability: p.inventory > 0 ? 'in stock' : 'out of stock',
            inventory: String(p.inventory),
        }).toString(),
     }));
     
     try {
        const batchResponses = await this.batchRequest(requests);
        const failedResponses = batchResponses.filter((res: any) => res && res.code !== 200);

        if (failedResponses.length > 0) {
            let errorMessage = 'One or more products failed to be added.';
            try {
                const errorBody = JSON.parse(failedResponses[0].body);
                if (errorBody.error && errorBody.error.message) {
                    errorMessage = errorBody.error.message;
                }
            } catch (e) { /* Ignore parsing error */ }
            throw new Error(errorMessage);
        }

        this.logger?.success(`Successfully submitted batch request to add ${newProducts.length} product(s).`);
        return batchResponses;
    } catch (error) {
        this.logger?.error("Failed to add products batch", error);
        throw error;
    }
  }

  async deleteProducts(productIds: string[]): Promise<any> {
    if (productIds.length === 0) return [];
    this.logger?.info(`Attempting to delete ${productIds.length} product(s)...`);
    const requests: BatchRequest[] = productIds.map(id => ({
        method: 'DELETE',
        relative_url: id,
    }));
    
    try {
        const batchResponses = await this.batchRequest(requests);
        const failedResponses = batchResponses.filter((res: any) => res && res.code !== 200);
        
        if (failedResponses.length > 0) {
            let errorMessage = 'One or more products failed to be deleted.';
            try {
                const errorBody = JSON.parse(failedResponses[0].body);
                if (errorBody.error && errorBody.error.message) {
                    errorMessage = errorBody.error.message;
                }
            } catch (e) { /* Ignore parsing error */ }
            throw new Error(errorMessage);
        }
        
        this.logger?.success(`Successfully submitted batch request to delete ${productIds.length} product(s).`);
        return batchResponses;
    } catch (error) {
        this.logger?.error("Failed to delete products batch", error);
        throw error;
    }
  }

  async getSets(): Promise<ProductSet[]> {
    this.logger?.info("Fetching product sets...");
    const path = `/${this.catalogId}/product_sets?fields=id,name,product_count`;
    try {
        const response = await this.apiRequest(path);
        const sets: ProductSet[] = response.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          productIds: [], 
        }));
        this.logger?.success(`Successfully fetched ${sets.length} product sets.`);
        return sets;
    } catch (error) {
        this.logger?.error("Failed to fetch product sets", error);
        throw error;
    }
  }

  async createSet(name: string, productIds: string[]): Promise<ProductSet> {
    this.logger?.info(`Creating new product set "${name}" with ${productIds.length} product(s)...`);
    try {
        const newSetResponse = await this.apiRequest(`/${this.catalogId}/product_sets`, 'POST', { name });
        const newSetId = newSetResponse.id;

        if (productIds.length > 0) {
            this.logger?.info(`Adding ${productIds.length} product(s) to new set "${name}"...`);
            await this.apiRequest(`/${newSetId}/products`, 'POST', { product_items: productIds });
        }
        
        this.logger?.success(`Successfully created set "${name}" (ID: ${newSetId}).`);
        return { id: newSetId, name, productIds };
    } catch(error) {
        this.logger?.error(`Failed to create set "${name}"`, error);
        throw error;
    }
  }

  async deleteSets(setIds: string[]): Promise<any> {
    if (setIds.length === 0) return [];
    this.logger?.info(`Attempting to delete ${setIds.length} set(s)...`);
    const requests: BatchRequest[] = setIds.map(id => ({
        method: 'DELETE',
        relative_url: id,
    }));
    try {
        const batchResponses = await this.batchRequest(requests);
        const failedResponses = batchResponses.filter((res: any) => res && res.code !== 200);

        if (failedResponses.length > 0) {
            let errorMessage = 'One or more sets failed to be deleted.';
            try {
                const errorBody = JSON.parse(failedResponses[0].body);
                if (errorBody.error && errorBody.error.message) {
                    errorMessage = errorBody.error.message;
                }
            } catch (e) { /* Ignore parsing error */ }
            throw new Error(errorMessage);
        }
        
        this.logger?.success(`Successfully submitted batch request to delete ${setIds.length} set(s).`);
        return batchResponses;
    } catch(error) {
        this.logger?.error("Failed to delete sets batch", error);
        throw error;
    }
  }
  
  async updateSet(setId: string, name: string, productIds: string[]): Promise<ProductSet> {
    this.logger?.info(`Updating set "${name}" (ID: ${setId})...`);
    try {
        // 1. Update name
        this.logger?.info(`Updating name for set ${setId} to "${name}".`);
        await this.apiRequest(`/${setId}`, 'POST', { name });

        // 2. Get current products in set
        this.logger?.info(`Fetching current products for set ${setId}.`);
        const currentProductsResponse = await this.apiRequest(`/${setId}/products?fields=id&limit=1000`);
        const currentProductIds: string[] = currentProductsResponse.data.map((p: any) => p.id);
        const currentProductIdsSet = new Set(currentProductIds);
        const newProductIdsSet = new Set(productIds);

        // 3. Calculate differences
        const idsToAdd = productIds.filter(id => !currentProductIdsSet.has(id));
        const idsToRemove = currentProductIds.filter(id => !newProductIdsSet.has(id));
        
        // 4. Execute additions and removals
        if (idsToRemove.length > 0) {
            this.logger?.info(`Removing ${idsToRemove.length} product(s) from set ${setId}.`);
            await this.apiRequest(`/${setId}/products`, 'DELETE', { product_items: idsToRemove });
        }
        if (idsToAdd.length > 0) {
            this.logger?.info(`Adding ${idsToAdd.length} product(s) to set ${setId}.`);
            await this.apiRequest(`/${setId}/products`, 'POST', { product_items: idsToAdd });
        }
        
        this.logger?.success(`Successfully updated set "${name}".`);
        return { id: setId, name, productIds };
    } catch(error) {
        this.logger?.error(`Failed to update set "${name}"`, error);
        throw error;
    }
  }
}

export default FacebookCatalogService;