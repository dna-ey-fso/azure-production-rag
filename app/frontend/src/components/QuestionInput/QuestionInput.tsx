import { ChangeEvent, useEffect, useState, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { IStyleFunctionOrObject, Stack, TextField } from "@fluentui/react";
import { Button, Tooltip, Spinner, ToggleButton } from "@fluentui/react-components";
import { Toggle } from "@fluentui/react/lib/Toggle";
import { isLoggedIn, requireAccessControl } from "../../authConfig";

import styles from "./QuestionInput.module.css";
import UploadFiles from "../UploadFiles/UploadFiles";
import { useMutation } from "react-query";
import { IRemoveRequest, IRemoveResponse, removeFilesApi } from "../../api";
import { Send24Filled } from "@fluentui/react-icons";

interface Props {
    onSend: (question: string) => void;
    setDocFilter: (docs: string | undefined) => void;
    disabled: boolean;
    initQuestion?: string;
    placeholder?: string;
    clearOnSend?: boolean;
}

export const QuestionInput = ({ onSend, setDocFilter, disabled, placeholder, clearOnSend, initQuestion }: Props) => {
    const [question, setQuestion] = useState<string>("");
    const [filter, setFilter] = useState<string | undefined>();

    const setDocumentFilter = (filter: string | undefined) => {
        setDocFilter(filter);
        setFilter(filter);
    };

    useEffect(() => {
        initQuestion && setQuestion(initQuestion);
    }, [initQuestion]);

    const sendQuestion = () => {
        if (disabled || !question.trim()) {
            return;
        }

        onSend(question);

        if (clearOnSend) {
            setQuestion("");
        }
    };

    const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            sendQuestion();
        }
    };

    const onQuestionChange = (_ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
        if (!newValue) {
            setQuestion("");
        } else if (newValue.length <= 1000) {
            setQuestion(newValue);
        }
    };

    const { instance } = useMsal();
    const disableRequiredAccessControl = requireAccessControl && !isLoggedIn(instance);
    const sendQuestionDisabled = disabled || !question.trim() || disableRequiredAccessControl;

    if (disableRequiredAccessControl) {
        placeholder = "Please login to continue...";
    }

    return (
        <Stack className={styles.inputContainer}>
            {filter && <p>Only retrieving information from: {filter}</p>}
            <Stack horizontal className={styles.inputUpload}>
                <Stack horizontal className={styles.questionInputContainer}>
                    <TextField
                        className={styles.questionInputTextArea}
                        disabled={disableRequiredAccessControl}
                        placeholder={placeholder}
                        multiline
                        resizable={false}
                        borderless
                        value={question}
                        onChange={onQuestionChange}
                        onKeyDown={onEnterPress}
                    />
                    <div className={styles.questionInputButtonsContainer}>
                        <Tooltip content="Ask question button" relationship="label">
                            <Button
                                size="large"
                                icon={<Send24Filled primaryFill="rgba(115, 118, 225, 1)" />}
                                disabled={sendQuestionDisabled}
                                onClick={sendQuestion}
                            />
                        </Tooltip>
                    </div>
                </Stack>
                <UploadFiles setDocFilter={setDocumentFilter} />
            </Stack>
        </Stack>
    );
};
