import { Icon } from "@fluentui/react/lib/Icon";
import DOMPurify from "dompurify";

import { parseAnswerToHtml } from "../Answer/AnswerParser";
import { ChatAppResponse } from "../../api";
import styles from "./FeedbackItem.module.css";

interface Props {
    id: string;
    feedback: string;
    question: string;
    answer: ChatAppResponse;
    comment: string;
    setActiveSample: (sample: string) => void;
}

const FeedbackItem = ({ id, feedback, question, answer, comment, setActiveSample }: Props) => {
    const choice = answer.choices[0];
    const index: number = choice.index;
    const message: string = choice.message.content;
    const context: string[] = choice.context.data_points;
    const session_state: any = choice.session_state;

    const parsedAnswer = parseAnswerToHtml(message, false, () => {});
    const sanitizedAnswerHtml = DOMPurify.sanitize(parsedAnswer.answerHtml);

    return (
        <section className={[styles.feedbackItemContainer, feedback === "good" ? styles.feedbackGood : styles.feedbackBad].join(" ")}>
            <div className={styles.feedbackItem}>
                {/* <span>Feedback</span>
                <p>{feedback === "good" ? <Icon iconName="Like" /> : <Icon iconName="Dislike" />}</p> */}
                <span>Comment</span>
                <p>{comment}</p>
                <span>Question</span>
                <p>{question}</p>
                <span>Answer</span>
                <p className={styles.answerText} dangerouslySetInnerHTML={{ __html: sanitizedAnswerHtml }}></p>
            </div>
            <button className={styles.detailsButton} onClick={() => setActiveSample(id)}>
                Details
            </button>
        </section>
    );
};
export default FeedbackItem;
