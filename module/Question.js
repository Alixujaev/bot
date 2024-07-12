import { Schema, model } from "mongoose";

const QuectionSchema = new Schema({
  chatId: { type: String, required: true },
  from: { type: String, required: true },
  question: { type: String, required: true },
  answered: { type: Boolean, default: false },
  messageId: { type: String },
});

export default model("Question", QuectionSchema)