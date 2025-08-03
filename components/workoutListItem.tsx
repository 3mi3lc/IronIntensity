import {Workout} from "@/repositories/types";
import {TouchableOpacity, Text, Alert} from "react-native";


const WorkoutListItem = ({ workout }: { workout: Workout }) => {

    return(
        <TouchableOpacity
            onPress={() =>
                Alert.alert('Workout Selected', `You tapped on "${workout.name}"`)}
            className="bg-surface_a10 p-4 mb-2 rounded-xl"
        >
            <Text className="text-white font-semibold text-base">
                {workout.name}
            </Text>
        </TouchableOpacity>
    );
}

export default WorkoutListItem;