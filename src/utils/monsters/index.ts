export const limits = {
    worlds: {
        min: 1,
        max: 35,
    },
    check: (level: number) => {
        if (level < limits.worlds.min || level > limits.worlds.max) {
            return false;
        }
        return true;
    },
};
