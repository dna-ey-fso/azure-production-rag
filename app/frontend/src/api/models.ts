export const enum RetrievalMode {
    Hybrid = "hybrid",
    Vectors = "vectors",
    Text = "text"
}

export const enum GPT4VInput {
    TextAndImages = "textAndImages",
    Images = "images",
    Texts = "texts"
}

export const enum VectorFieldOptions {
    Embedding = "embedding",
    ImageEmbedding = "imageEmbedding",
    Both = "both"
}

export type ChatAppRequestOverrides = {
    retrieval_mode?: RetrievalMode;
    semantic_ranker?: boolean;
    semantic_captions?: boolean;
    exclude_category?: string;
    top?: number;
    temperature?: number;
    prompt_template?: string;
    prompt_template_prefix?: string;
    prompt_template_suffix?: string;
    suggest_followup_questions?: boolean;
    use_oid_security_filter?: boolean;
    use_groups_security_filter?: boolean;
    use_gpt4v?: boolean;
    gpt4v_input?: GPT4VInput;
    vector_fields: VectorFieldOptions[];
    document_filter?: string;
};

export type ResponseMessage = {
    content: string;
    role: string;
};

export type Thoughts = {
    title: string;
    description: any; // It can be any output from the api
    props?: { [key: string]: string };
};

export type ResponseContext = {
    data_points: string[];
    followup_questions: string[] | null;
    thoughts: Thoughts[];
};

export type ResponseChoice = {
    index: number;
    message: ResponseMessage;
    context: ResponseContext;
    session_state: any;
};

export type ChatAppResponseOrError = {
    choices?: ResponseChoice[];
    error?: string;
};

export type ChatAppResponse = {
    choices: ResponseChoice[];
};

export type ChatAppRequestContext = {
    overrides?: ChatAppRequestOverrides;
};

export type ChatAppRequest = {
    messages: ResponseMessage[];
    context?: ChatAppRequestContext;
    stream?: boolean;
    session_state: any;
};

export type Config = {
    showGPT4VOptions: boolean;
    showSemanticRankerOption: boolean;
    showVectorOption: boolean;
};

export type EvaluationRequest = {
    question: string;
    contexts: string[];
    answer: string;
};

export type EvaluationResponse = {
    contextPrecision: number;
    answerRelevance: number;
    faithfulness: number;
};

export type Feedback = {
    id: string;
    feedback: string;
    question: string;
    answer: ChatAppResponse;
    comment: string;
};

export type FeedbackResponse = {
    feedbacks: Feedback[];
};

export type ExperimentList = {
    experiment_names: string[];
};

export type DocumentList = {
    documents: string[];
};

export type IUploadFormData = {
    formData: FormData;
};

export type IUploadResponse = {
    success: boolean;
    message?: string;
};

export type IRemoveRequest = {
    filenames: string[];
};

export type IRemoveResponse = {
    success: boolean;
    message?: string;
};
