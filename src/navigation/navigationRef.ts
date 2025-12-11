import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export const navigate = (name: string, params?: object) => {
    if (navigationRef.isReady()) {
        // Use a loose call signature to avoid route typing churn
        (navigationRef as any).navigate(name, params);
    }
};
