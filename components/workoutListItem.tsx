import {Workout} from "@/repositories/types";
import {TouchableOpacity, Text} from "react-native";
import { useRouter} from "expo-router";


const WorkoutListItem = ({ workout }: { workout: Workout }) => {
    const router = useRouter();

    return(
        <TouchableOpacity
            onPress={() =>
                router.push({
                    pathname: '/workout/createWorkout',
                    params: {
                        id: workout.id,
                        name: workout.name,
                    },
                })
            }
            className="bg-surface_a10 p-4 mb-2 rounded-xl"
        >
            <Text className="text-white font-semibold text-base">
                {workout.name}
            </Text>
        </TouchableOpacity>
    );
}

export default WorkoutListItem;