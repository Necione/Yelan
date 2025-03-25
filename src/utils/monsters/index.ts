export const limits = {
    worlds: {
        min: 1,
        max: 50,
    },
    check: (level: number) => {
        if (level < limits.worlds.min || level > limits.worlds.max) {
            return false;
        }
        return true;
    },
};
