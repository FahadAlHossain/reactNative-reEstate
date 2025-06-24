import {
  Client,
  Account,
  ID,
  Databases,
  OAuthProvider,
  Avatars,
  Query,
  Storage,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";

export const config = {
  platform: "com.jsm.restate",
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_GALARIES_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  propertiesCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  bookingsCollectionId:
    process.env.EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
};

export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export async function login() {
  try {
    const redirectUri = Linking.createURL("/");

    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );
    if (!response) throw new Error("Create OAuth2 token failed");

    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );
    if (browserResult.type !== "success")
      throw new Error("Create OAuth2 token failed");

    const url = new URL(browserResult.url);
    const secret = url.searchParams.get("secret")?.toString();
    const userId = url.searchParams.get("userId")?.toString();
    if (!secret || !userId) throw new Error("Create OAuth2 token failed");

    const session = await account.createSession(userId, secret);
    if (!session) throw new Error("Failed to create session");

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function logout() {
  try {
    const result = await account.deleteSession("current");
    return result;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (result.$id) {
      const userAvatar = avatar.getInitials(result.name);

      return {
        ...result,
        avatar: userAvatar.toString(),
      };
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function getLatestProperties() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.orderAsc("$createdAt"), Query.limit(5)]
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  try {
    const buildQuery = [Query.orderDesc("$createdAt")];

    if (filter && filter !== "All")
      buildQuery.push(Query.equal("type", filter));

    if (query)
      buildQuery.push(
        Query.or([
          Query.search("name", query),
          Query.search("address", query),
          Query.search("type", query),
        ])
      );

    if (limit) buildQuery.push(Query.limit(limit));

    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      buildQuery
    );

    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

// write function to get property by id
export async function getPropertyById({ id }: { id: string }) {
  try {
    const result = await databases.getDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id
    );
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getMyBookings({ userId }: { userId: string }) {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.bookingsCollectionId!,
      [Query.equal("userId", userId)]
    );

    const bookingsWithDetails = await Promise.all(
      result.documents.map(async (booking) => {
        try {
          const property = await databases.getDocument(
            config.databaseId!,
            config.propertiesCollectionId!,
            booking.propertyId
          );

          return {
            ...booking,
            name: property.name,
            address: property.address,
            image: property.image,
            price: property.price,
          };
        } catch (e) {
          console.error("Failed to fetch property details:", e);
          return null;
        }
      })
    );

    // Filter out failed ones
    return bookingsWithDetails.filter((b) => b !== null);
  } catch (error) {
    console.error("Failed to get bookings:", error);
    return [];
  }
}



export async function bookProperty({ userId, propertyId }: { userId: string; propertyId: string }) {
  try {
    const result = await databases.createDocument(
      config.databaseId!,
      config.bookingsCollectionId!,
      ID.unique(),
      {
        userId,
        propertyId,
        bookedAt: new Date().toISOString(),
      }
    );
    return result;
  } catch (error) {
    console.error("Booking failed:", error);
    return null;
  }
}
export async function deleteBooking({ bookingId }: { bookingId: string }) {
  try {
    const result = await databases.deleteDocument(
      config.databaseId!,
      config.bookingsCollectionId!,
      bookingId
    );
    console.log("Booking deleted successfully:", result);
    return true;
  } catch (error: any) {
    console.error("Delete booking failed:", {
      message: error.message,
      code: error.code,
      response: error.response,
    });
    return false;
  }
}



export async function isPropertyBooked({
  userId,
  propertyId,
}: {
  userId: string;
  propertyId: string;
}) {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.bookingsCollectionId!,
      [Query.equal("userId", userId), Query.equal("propertyId", propertyId)]
    );

    return result.documents.length > 0;
  } catch (error) {
    console.error("Booking check failed:", error);
    return false;
  }
}



