import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { deleteBooking, getCurrentUser, getMyBookings } from "@/lib/appwrite";
import { useRouter } from "expo-router";

const MyBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const user = await getCurrentUser();
      if (!user) return;

      const results = await getMyBookings({ userId: user.$id });
      setBookings(results);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleDelete = (bookingId: string) => {
    Alert.alert("Confirm", "Are you sure you want to cancel this booking?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          const success = await deleteBooking({ bookingId });

          if (success) {
            Alert.alert("Success", "Booking cancelled!");
            setBookings((prev) => prev.filter((b) => b.$id !== bookingId));
          } else {
            Alert.alert("Error", "Delete failed — check console logs");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-2">Loading bookings...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="bg-white px-5 pt-10">
      <Text className="text-2xl font-rubik-bold mb-5">My Bookings</Text>

      {bookings.length === 0 ? (
        <Text className="text-black-200">No bookings yet.</Text>
      ) : (
        bookings.map((property) => (
          <View
            key={property.$id}
            className="mb-5 bg-primary-100 rounded-xl overflow-hidden"
          >
            <TouchableOpacity
              onPress={() => router.push(`/properties/${property.propertyId}`)}
            >
              <Image source={{ uri: property.image }} className="w-full h-40" />
              <View className="p-4">
                <Text className="text-lg font-rubik-bold">{property.name}</Text>
                <Text className="text-black-300">{property.address}</Text>
                <Text className="text-primary-300 font-rubik-bold">
                  ${property.price}
                </Text>
                <Text className="text-black-200 text-xs mt-1">
                  Booked on: {new Date(property.bookedAt).toDateString()}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-3 bg-danger px-4 py-2 rounded-full mx-4 mb-4"
              onPress={() => handleDelete(property.$id)}
            >
              <Text className="text-white text-center font-rubik-bold">
                Cancel Booking
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default MyBookings;
