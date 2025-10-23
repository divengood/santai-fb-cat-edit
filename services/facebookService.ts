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

    // Cache-busting for GET requests to ensure fresh data
    if (method === 'GET') {
      url.searchParams.append('_', Date.now().toString());
    }

    const options: RequestInit = {
      method,
    };

    if (method !== 'GET' && body) {
        options.headers = {'Content-Type': 'application/json'};
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url.toString(), options);
    const responseText = await response.text();

    if (response.ok) {
        try {
            return responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error("Failed to parse successful response JSON", responseText, e);
            throw new Error("Received a malformed success response from the server.");
        }
    }

    // Handle error responses
    let errorMessage = `Request failed with status ${response.status}`;
    if (responseText) {
        try {
            const errorData = JSON.parse(responseText);
            console.error('Facebook API Error:', errorData);
            errorMessage = errorData.error?.message || responseText;
        } catch (e) {
            console.error('Facebook API non-JSON error:', responseText);
            errorMessage = `Request failed with status ${response.status}: ${responseText}`;
        }
    }
    throw new Error(errorMessage);
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
    
    const responseText = await response.text();

    if (response.ok) {
        try {
            return responseText ? JSON.parse(responseText) : []; // Batch should return an array
        } catch (e) {
            console.error("Failed to parse successful batch response JSON", responseText, e);
            throw new Error("Received a malformed success response from the server for a batch request.");
        }
    }
    
    let errorMessage = `Batch request failed with status ${response.status}`;
    if (responseText) {
        try {
            const errorData = JSON.parse(responseText);
            console.error('Facebook Batch API Error:', errorData);
            errorMessage = errorData.error?.message || responseText;
        } catch (e) {
            console.error('Facebook Batch API non-JSON error:', responseText);
            errorMessage = `Batch request failed with status ${response.status}: ${responseText}`;
        }
    }
    
    throw new Error(errorMessage);
  }

  async getProducts(): Promise<Product[]> {
    this.logger?.info("Fetching all products from catalog (with pagination)...");
    let allProductsData: any[] = [];
    let nextUrl: string | null = `${BASE_URL}/${this.catalogId}/products?fields=id,retailer_id,name,description,brand,url,price,currency,image_url,inventory,review_status,rejection_reasons&limit=100&access_token=${this.apiToken}`;

    try {
        while (nextUrl) {
            // Add cache buster to each paginated request
            const urlToFetch = `${nextUrl}&_=${Date.now()}`;
            const response = await fetch(urlToFetch);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Facebook API Error:', errorData);
                throw new Error(errorData.error?.message || 'An unknown API error occurred while paginating.');
            }
            
            const responseData = await response.json();

            if (responseData.data && responseData.data.length > 0) {
                allProductsData = allProductsData.concat(responseData.data);
            }

            // Check for the next page link
            if (responseData.paging && responseData.paging.next) {
                nextUrl = responseData.paging.next;
            } else {
                nextUrl = null;
            }
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
            rejectionReasons: p.rejection_reasons || [],
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
     this.logger?.info(`Attempting to add ${newProducts.length} product(s)...`);
     
     const requests: BatchRequest[] = newProducts.map(p => {
        const params = new URLSearchParams({
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
        });

        return {
            method: 'POST',
            relative_url: `${this.catalogId}/products?${params.toString()}`,
        };
     });
     
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
  
  async refreshProductsStatus(productIds: string[]): Promise<Map<string, { reviewStatus: 'approved' | 'pending' | 'rejected'; rejectionReasons?: string[] }>> {
    if (productIds.length === 0) return new Map();
    this.logger?.info(`Refreshing statuses for ${productIds.length} product(s)...`);
    
    const cacheBuster = `&_=${Date.now()}`;
    const requests: BatchRequest[] = productIds.map(id => ({
        method: 'GET',
        relative_url: `${id}?fields=review_status,rejection_reasons${cacheBuster}`,
    }));
    
    try {
        const batchResponses = await this.batchRequest(requests);
        
        const statusMap = new Map<string, { reviewStatus: 'approved' | 'pending' | 'rejected'; rejectionReasons?: string[] }>();

        batchResponses.forEach((res: any, index: number) => {
            if (res && res.code === 200) {
                try {
                    const body = JSON.parse(res.body);
                    statusMap.set(body.id, {
                        reviewStatus: body.review_status || 'pending',
                        rejectionReasons: body.rejection_reasons || [],
                    });
                } catch (e) {
                    this.logger?.warn(`Failed to parse status response for product ID ${productIds[index]}`);
                }
            } else {
                this.logger?.warn(`Failed to fetch status for product ID ${productIds[index]}`);
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
    const path = `/${this.catalogId}/product_sets?fields=id,name`;
    try {
        // Step 1: Fetch all sets with their IDs and names
        const setsResponse = await this.apiRequest(path);
        const basicSets: {id: string, name: string}[] = setsResponse.data || [];

        if (basicSets.length === 0) {
            this.logger?.success("No product sets found in the catalog.");
            return [];
        }

        // Step 2: Create a batch request to get products for each set
        const batchRequests: BatchRequest[] = basicSets.map(set => ({
            method: 'GET',
            relative_url: `${set.id}/products?fields=id&limit=5000` // Fetch up to 5000 product IDs
        }));

        this.logger?.info(`Fetching products for ${basicSets.length} set(s)...`);
        const batchResponses = await this.batchRequest(batchRequests);

        // Step 3: Combine the results
        const setsWithProducts: ProductSet[] = basicSets.map((set, index) => {
            const response = batchResponses[index];
            let productIds: string[] = [];
            
            if (response && response.code === 200) {
                try {
                    const body = JSON.parse(response.body);
                    if (body.data && Array.isArray(body.data)) {
                        productIds = body.data.map((p: any) => p.id);
                    }
                } catch (e) {
                    this.logger?.warn(`Failed to parse product list for set "${set.name}" (ID: ${set.id})`);
                }
            } else {
                this.logger?.warn(`Failed to fetch products for set "${set.name}" (ID: ${set.id})`);
            }

            return {
                id: set.id,
                name: set.name,
                productIds: productIds,
            };
        });
        
        this.logger?.success(`Successfully fetched ${setsWithProducts.length} product sets and their contents.`);
        return setsWithProducts;

    } catch (error) {
        this.logger?.error("Failed to fetch product sets", error);
        throw error;
    }
  }


  async createSet(name: string, productIds: string[]): Promise<ProductSet> {
    this.logger?.info(`Creating new product set "${name}" with ${productIds.length} product(s)...`);
    try {
        const payload: { name: string; filter?: object } = { name };
        if (productIds.length > 0) {
            payload.filter = {
                product_item_id: { is_any: productIds }
            };
        }

        const newSetResponse = await this.apiRequest(`/${this.catalogId}/product_sets`, 'POST', payload);
        const newSetId = newSetResponse.id;
        
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
    this.logger?.info(`Updating set "${name}" (ID: ${setId}) with ${productIds.length} products...`);
    try {
        const payload: { name: string; filter: object } = {
            name,
            // Use a filter that matches nothing if no products are selected,
            // or a filter for the selected products.
            filter: {
                product_item_id: { is_any: productIds.length > 0 ? productIds : [] }
            }
        };

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