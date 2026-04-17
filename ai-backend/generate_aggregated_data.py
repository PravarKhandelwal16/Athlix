import pandas as pd
import numpy as np
import os

def generate_aggregated_data():
    csv_path = os.path.join("..", "dataset", "squat_dataset", "squat_features_augmented.csv")
    if not os.path.exists(csv_path):
        csv_path = os.path.join("dataset", "squat_dataset", "squat_features_augmented.csv")
    
    print(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)
    
    # Define features
    cols_to_drop = ["video_file", "frame", "label"]
    feature_names = [col for col in df.columns if col not in cols_to_drop]
    
    window_size = 15
    aggregated_data = []
    
    # Group by video_file to ensure we don't mix frames between videos
    grouped = df.groupby('video_file')
    
    print(f"Aggregating features using window size {window_size}...")
    for video, group in grouped:
        group = group.sort_values('frame')
        if len(group) < window_size:
            continue
            
        # Extract feature values as numpy array
        features_array = group[feature_names].values
        labels = group['label'].values
        
        # Sliding window
        for i in range(window_size - 1, len(group)):
            window = features_array[i - (window_size - 1) : i + 1]
            
            # Aggregate: Mean, Std, Min, Max
            f_mean = np.mean(window, axis=0)
            f_std = np.std(window, axis=0)
            f_min = np.min(window, axis=0)
            f_max = np.max(window, axis=0)
            
            # Combine into a single vector (48 features)
            combined_vector = np.concatenate([f_mean, f_std, f_min, f_max])
            
            # Use the label of the last frame in the window
            label = labels[i]
            
            # Append combined vector + label
            aggregated_data.append(np.append(combined_vector, label))
            
    # Create new column names
    new_cols = []
    for stat in ['mean', 'std', 'min', 'max']:
        for feat in feature_names:
            new_cols.append(f"{feat}_{stat}")
    new_cols.append('label')
    
    # Convert to DataFrame
    agg_df = pd.DataFrame(aggregated_data, columns=new_cols)
    
    output_path = "dataset_aggregated.csv"
    agg_df.to_csv(output_path, index=False)
    print(f"Aggregated dataset saved to {output_path}. Shape: {agg_df.shape}")

if __name__ == "__main__":
    generate_aggregated_data()
