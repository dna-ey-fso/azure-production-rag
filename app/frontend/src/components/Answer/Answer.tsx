import { useMemo, useState } from "react";
import { Stack, IconButton } from "@fluentui/react";
import DOMPurify from "dompurify";
import { v4 as uuidv4 } from "uuid";
import { useMutation } from "react-query";

import styles from "./Answer.module.css";

import { ChatAppResponse, getCitationFilePath, postFeedbackApi, Feedback } from "../../api";
import { useLogin, getToken } from "../../authConfig";
import { useMsal } from "@azure/msal-react";
import { parseAnswerToHtml, removeCitations } from "./AnswerParser";
import { AnswerIcon } from "./AnswerIcon";

interface Props {
    answer: ChatAppResponse;
    question: string;
    isSelected?: boolean;
    isStreaming: boolean;
    onCitationClicked: (filePath: string) => void;
    onThoughtProcessClicked: () => void;
    onSupportingContentClicked: () => void;
    onEvaluationClicked: () => void;
    onFollowupQuestionClicked?: (question: string) => void;
    showFollowupQuestions?: boolean;
}

export const Answer = ({
    answer,
    question,
    isSelected,
    isStreaming,
    onCitationClicked,
    onThoughtProcessClicked,
    onSupportingContentClicked,
    onEvaluationClicked,
    onFollowupQuestionClicked,
    showFollowupQuestions
}: Props) => {
    const followupQuestions = answer.choices[0].context.followup_questions;
    const messageContent = answer.choices[0].message.content;
    const parsedAnswer = useMemo(() => parseAnswerToHtml(messageContent, isStreaming, onCitationClicked), [answer]);
    const removeCitationsAnswer = removeCitations(answer.choices[0].message.content);
    const sanitizedAnswerHtml = DOMPurify.sanitize(parsedAnswer.answerHtml);

    const [feedbackType, setFeedbackType] = useState<string>("");
    const [comment, setComment] = useState<string>("");
    const [givingFeedback, setGivingFeedback] = useState<boolean>(false);
    const [feedbackGiven, setFeedbackGiven] = useState<boolean>(false);

    const {
        mutate: postFeedback,
        isLoading,
        error
    } = useMutation({
        mutationFn: (feedback: Feedback) => postFeedbackApi(feedback, undefined),
        onSuccess: () => {
            setFeedbackGiven(true);
            setGivingFeedback(false);
        },
        onError: error => {
            setGivingFeedback(false);
            console.log(error);
        }
    });

    const onGivingFeedback = async (type: string) => {
        setFeedbackType(type);
        setGivingFeedback(true);
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        const client = useLogin ? useMsal().instance : undefined;
        const token = client ? await getToken(client) : undefined;

        const request: Feedback = {
            id: uuidv4(),
            feedback: feedbackType,
            question: question,
            answer: answer,
            comment: comment
        };
        postFeedback(request);
    };

    const handleContactClick = () => {
        const email = "jiri.de.jonghe@be.ey.com;sofyan.ajridi@be.ey.com";
        const emailTemplate = `Dear [Recipient's Name]\n\nI hope you are doing well. We're contacting you regarding the question you asked: \n\n${question}\n\n${removeCitationsAnswer}\n\nThank you for your time.\n\nKind Regards,\n[Your Name]\n[Your Position]\n[Your Company]\n[Your Contact Information]`;
        window.open(`mailto:${email}?subject=${encodeURIComponent("Question Follow-up") || ""}&body=${encodeURIComponent(emailTemplate) || ""}`);
    };

    return (
        <Stack className={`${styles.answerContainer} ${isSelected && styles.selected}`} verticalAlign="space-between">
            <Stack.Item>
                <Stack horizontal horizontalAlign="space-between">
                    <AnswerIcon />
                    <div>
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "Lightbulb" }}
                            title="Show thought process"
                            ariaLabel="Show thought process"
                            onClick={() => onThoughtProcessClicked()}
                            disabled={!answer.choices[0].context.thoughts?.length}
                        />
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "ClipboardList" }}
                            title="Show supporting content"
                            ariaLabel="Show supporting content"
                            onClick={() => onSupportingContentClicked()}
                            disabled={!answer.choices[0].context.data_points}
                        />
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "BarChartVertical" }}
                            title="Show Evaluation"
                            ariaLabel="Show Evaluation"
                            onClick={() => onEvaluationClicked()}
                            disabled={!answer.choices[0].context.data_points}
                        />
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "mail" }}
                            title="Send Email"
                            ariaLabel="Send Email"
                            onClick={() => handleContactClick()}
                            disabled={!answer.choices[0].context.data_points}
                        />
                    </div>
                </Stack>
            </Stack.Item>

            <Stack.Item grow>
                <div className={styles.answerText} dangerouslySetInnerHTML={{ __html: sanitizedAnswerHtml }}></div>
            </Stack.Item>

            {!!parsedAnswer.citations.length && (
                <Stack.Item>
                    <Stack horizontal wrap tokens={{ childrenGap: 5 }}>
                        <span className={styles.citationLearnMore}>Citations:</span>
                        {parsedAnswer.citations.map((x, i) => {
                            const path = getCitationFilePath(x);
                            return (
                                <a key={i} className={styles.citation} title={x} onClick={() => onCitationClicked(path)}>
                                    {`${++i}. ${x}`}
                                </a>
                            );
                        })}
                    </Stack>
                </Stack.Item>
            )}

            {!!followupQuestions?.length && showFollowupQuestions && onFollowupQuestionClicked && (
                <Stack.Item>
                    <Stack horizontal wrap className={`${!!parsedAnswer.citations.length ? styles.followupQuestionsList : ""}`} tokens={{ childrenGap: 6 }}>
                        <span className={styles.followupQuestionLearnMore}>Follow-up questions:</span>
                        {followupQuestions.map((x, i) => {
                            return (
                                <a key={i} className={styles.followupQuestion} title={x} onClick={() => onFollowupQuestionClicked(x)}>
                                    {`${x}`}
                                </a>
                            );
                        })}
                    </Stack>
                </Stack.Item>
            )}

            <Stack.Item>
                {feedbackGiven ? (
                    <div className={styles.satisfactionContainer}>
                        <span className={styles.satisfactory}>Thank you for your feedback!</span>
                    </div>
                ) : givingFeedback ? (
                    <form onSubmit={handleSubmit} className={styles.feedbackContainer}>
                        <input className={styles.textInput} type="text" name="comment" onChange={e => setComment(e.target.value)} placeholder="Add a comment" />
                        <button type="submit" disabled={isLoading || comment.length === 0}>
                            Send
                        </button>
                    </form>
                ) : (
                    <div className={styles.satisfactionContainer}>
                        <span className={styles.satisfactory}>Did you like this response?</span>
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "Like" }}
                            title="Show thought process"
                            ariaLabel="Show thought process"
                            onClick={() => onGivingFeedback("good")}
                            disabled={!answer.choices[0].context.thoughts?.length}
                        />
                        <IconButton
                            style={{ color: "black" }}
                            iconProps={{ iconName: "Dislike" }}
                            title="Show supporting content"
                            ariaLabel="Show supporting content"
                            onClick={() => onGivingFeedback("bad")}
                            disabled={!answer.choices[0].context.data_points}
                        />
                    </div>
                )}
            </Stack.Item>
        </Stack>
    );
};
