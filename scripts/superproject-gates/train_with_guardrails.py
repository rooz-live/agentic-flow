# --- Goalie Code Fix: ml-training-guardrail ---

# TensorFlow checkpointing and early stopping
import tensorflow as tf

checkpoint_callback = tf.keras.callbacks.ModelCheckpoint(
    filepath='checkpoints/checkpoint-{epoch:02d}-{val_loss:.2f}.h5',
    save_best_only=True,
    monitor='val_loss',
    mode='min'
)

early_stopping_callback = tf.keras.callbacks.EarlyStopping(
    monitor='val_loss',
    patience=5,
    min_delta=0.001,
    restore_best_weights=True
)

# In model.fit():
model.fit(
    train_dataset,
    validation_data=val_dataset,
    epochs=max_epochs,
    callbacks=[checkpoint_callback, early_stopping_callback]
)

