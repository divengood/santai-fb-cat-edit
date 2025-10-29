import { Product, ProductSet, NewProduct } from '../types';
import { Logger } from './loggingService';

const API_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const OAUTH_DETAILED_ERROR = `

Authentication Error (OAuthException): This can happen for several reasons. Please check the following:
1. Session Expired: Your login may have timed out. Please try disconnecting and logging back in.
2. Permissions: Ensure you granted the 'catalog_management' permission during login.
3. Facebook App Settings: Verify your App ID is correct and that your Facebook App is published (or you are listed as a developer/tester if it's in development mode).
4. User Role: You must be an admin of the Business Manager account that owns the product catalog.`;


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
  
  private isOAuthError(errorBody: any): boolean {
    return errorBody?.error && (errorBody.error.type === 'OAuthException' || errorBody.error.code === 1);
  }

  private async apiRequest(path: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: object | string, queryParams?: { [key: string]: any }) {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.append('access_token', this.apiToken);

    if (queryParams) {
        for (const key in queryParams) {
            if (queryParams[key] !== undefined) {
                url.searchParams.append(key, String(queryParams[key]));
            }
        }
    }

    // Cache-busting for GET requests to ensure fresh data
    if (method === 'GET') {
      url.searchParams.append('_', Date.now().toString());
    }

    const options: RequestInit = {
      method,
    };

    if (method !== 'GET' && body) {
        if (typeof body === 'string') {
            options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            options.body = body;
        } else {
            options.headers = {'Content-Type': 'application/json'};
            options.body = JSON.stringify(body);
        }
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
            if (this.isOAuthError(errorData)) {
                errorMessage += OAUTH_DETAILED_ERROR;
            }
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
             if (this.isOAuthError(errorData)) {
                errorMessage += OAUTH_DETAILED_ERROR;
            }
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
    let nextUrl: string | null = `${BASE_URL}/${this.catalogId}/products?fields=id,retailer_id,name,description,brand,url,price,currency,image_url,inventory,video_url&limit=100&access_token=${this.apiToken}`;

    try {
        while (nextUrl) {
            // Add cache buster to each paginated request
            const urlToFetch = `${nextUrl}&_=${Date.now()}`;
            const response = await fetch(urlToFetch);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Facebook API Error:', errorData);
                let errorMessage = errorData.error?.message || 'An unknown API error occurred while paginating.';
                 if (this.isOAuthError(errorData)) {
                    errorMessage += OAUTH_DETAILED_ERROR;
                }
                throw new Error(errorMessage);
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
            videoUrl: p.video_url,
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
        
        if (p.videoUrl) {
            params.append('video_url', p.videoUrl);
        }

        return {
            method: 'POST',
            relative_url: `${this.catalogId}/products?scrape=true`,
            body: params.toString(),
        };
     });
     
     try {
        const batchResponses = await this.batchRequest(requests);
        const failures = batchResponses
            .map((res: any, index: number) => ({ res, index }))
            .filter(({ res }) => res && res.code !== 200);

        if (failures.length > 0) {
            let isAuthError = false;
            const errorDetails = failures.map(({ res, index }) => {
                const originalRequestData = newProducts[index];
                let detail = `- Product "${originalRequestData.name}" (SKU: ${originalRequestData.retailer_id}): `;
                try {
                    const errorBody = JSON.parse(res.body);
                    if (errorBody.error && errorBody.error.message) {
                        const { message, type, code, error_subcode } = errorBody.error;
                        if (type === 'OAuthException' || code === 1) {
                            isAuthError = true;
                        }
                        detail += `${message} (Code: ${code}, Type: ${type}${error_subcode ? `, Subcode: ${error_subcode}` : ''})`;
                    } else {
                        detail += 'An unknown API error occurred.';
                    }
                } catch (e) { 
                    detail += `Could not parse error response. Body: ${res.body}`;
                }
                return detail;
            }).join('\n');
            
            let errorMessage = `${failures.length} of ${newProducts.length} products failed to be added:\n${errorDetails}`;
            if (isAuthError) {
                errorMessage += OAUTH_DETAILED_ERROR;
            }
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
        const failures = batchResponses
            .map((res: any, index: number) => ({ res, index }))
            .filter(({ res }) => res && res.code !== 200);
        
        if (failures.length > 0) {
            let isAuthError = false;
            const errorDetails = failures.map(({ res, index }) => {
                const productId = productIds[index];
                let detail = `- Product ID ${productId}: `;
                try {
                    const errorBody = JSON.parse(res.body);
                     if (errorBody.error && errorBody.error.message) {
                        const { message, type, code, error_subcode } = errorBody.error;
                         if (type === 'OAuthException' || code === 1) {
                            isAuthError = true;
                        }
                        detail += `${message} (Code: ${code}, Type: ${type}${error_subcode ? `, Subcode: ${error_subcode}` : ''})`;
                    } else {
                        detail += 'An unknown API error occurred.';
                    }
                } catch (e) {
                     detail += `Could not parse error response. Body: ${res.body}`;
                }
                return detail;
            }).join('\n');

            let errorMessage = `${failures.length} of ${productIds.length} products failed to be deleted:\n${errorDetails}`;
            if (isAuthError) {
                errorMessage += OAUTH_DETAILED_ERROR;
            }
            throw new Error(errorMessage);
        }
        
        this.logger?.success(`Successfully submitted batch request to delete ${productIds.length} product(s).`);
        return batchResponses;
    } catch (error) {
        this.logger?.error("Failed to delete products batch", error);
        throw error;
    }
  }

  async updateProduct(productId: string, updates: Partial<NewProduct>): Promise<any> {
    this.logger?.info(`Updating product ID: ${productId}...`);
    
    const payload: { [key: string]: any } = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.brand !== undefined) payload.brand = updates.brand;
    if (updates.link !== undefined) payload.url = updates.link;
    if (updates.price !== undefined) payload.price = Math.round(updates.price * 100);
    if (updates.currency !== undefined) payload.currency = updates.currency;
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
    if (updates.videoUrl !== undefined) payload.video_url = updates.videoUrl;
    if (updates.inventory !== undefined) {
      payload.inventory = updates.inventory;
      payload.availability = updates.inventory > 0 ? 'in stock' : 'out of stock';
    }
    
    if (Object.keys(payload).length === 0) {
        this.logger?.warn("Update called with no changes for product ID: " + productId);
        return { success: true, message: "No changes provided." };
    }

    try {
        const params = new URLSearchParams();
        for (const key in payload) {
            params.append(key, String(payload[key]));
        }
        
        const queryParams = { scrape: 'true' };

        const response = await this.apiRequest(`/${productId}`, 'POST', params.toString(), queryParams);
        this.logger?.success(`Successfully updated product ID: ${productId}.`);
        return response;
    } catch (error) {
        this.logger?.error(`Failed to update product ID: ${productId}`, error);
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
        const failures = batchResponses
            .map((res: any, index: number) => ({ res, index }))
            .filter(({ res }) => res && res.code !== 200);

        if (failures.length > 0) {
            let isAuthError = false;
            const errorDetails = failures.map(({ res, index }) => {
                const setId = setIds[index];
                let detail = `- Set ID ${setId}: `;
                 try {
                    const errorBody = JSON.parse(res.body);
                     if (errorBody.error && errorBody.error.message) {
                        const { message, type, code, error_subcode } = errorBody.error;
                        if (type === 'OAuthException' || code === 1) {
                            isAuthError = true;
                        }
                        detail += `${message} (Code: ${code}, Type: ${type}${error_subcode ? `, Subcode: ${error_subcode}` : ''})`;
                    } else {
                        detail += 'An unknown API error occurred.';
                    }
                } catch (e) {
                     detail += `Could not parse error response. Body: ${res.body}`;
                }
                return detail;
            }).join('\n');
            
            let errorMessage = `${failures.length} of ${setIds.length} sets failed to be deleted:\n${errorDetails}`;
            if (isAuthError) {
                errorMessage += OAUTH_DETAILED_ERROR;
            }
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