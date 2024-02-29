import styles from "./UploadFiles.module.css";

import { Callout, IIconProps, IconButton, Label, PrimaryButton, Text } from "@fluentui/react";
import { ArrowUpload24Filled } from "@fluentui/react-icons";
import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Button, Tooltip } from "@fluentui/react-components";
import { Send24Filled, Dismiss24Filled, Filter24Filled, FilterDismiss24Filled } from "@fluentui/react-icons";

import { PuffLoader } from "react-spinners";
import { useMutation } from "react-query";

import { IRemoveResponse, IUploadResponse, removeFilesApi, uploadFileApi } from "../../api";

interface Props {
    setDocFilter: (files: string | undefined) => void;
}
const UploadFiles = ({ setDocFilter }: Props) => {
    const [isCalloutVisible, setIsCalloutVisible] = useState<boolean>(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadedFile, setUploadedFile] = useState<IUploadResponse>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isOn, setIsOn] = useState<boolean>(true);
    const [uploadedFiles, setUploadedFiles] = useState<File[] | null>(null);

    const uploadMutation = useMutation<any, Error, FormData>(formData => uploadFileApi(formData, undefined), {
        onSettled: (data, error) => {
            // This callback is called whether the mutation succeeds or fails
            setIsLoading(false);

            if (error) {
                console.log("Mutation failed:", error);
            } else {
                console.log("Mutation successful:", data);
                setUploadedFile(data); // Assuming you have a state variable for uploaded files
            }

            setSelectedFiles([]);
        }
    });

    const removeMutation = useMutation<any, Error, { files: string[]; idToken?: string }>(({ files }) => removeFilesApi(files, undefined), {
        onSettled: (data, error) => {
            setIsLoading(false);

            if (error) {
                console.log("Deletion failed:", error);
            } else {
                console.log("Deletion Successful");
            }
        }
    });

    const handleClick = () => {
        setIsCalloutVisible(!isCalloutVisible);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFileList: File[] = [];
        if (e.target.files) {
            // Extract the selected files and store them in the state
            for (let i = 0; i < e.target.files.length; i++) {
                selectedFileList.push(e.target.files.item(i)!);
            }
        }
        setSelectedFiles(selectedFileList);
    };

    const handleRemoveFile = (fileToRemove: File) => {
        setSelectedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
    };

    const handleUploadFile = async (ev: FormEvent) => {
        ev.preventDefault();
        setIsLoading(true); // Start the loading state
        const formData = new FormData();
        // Append each file to the FormData
        selectedFiles.forEach((file, index) => {
            formData.append(`file${index}`, file);
        });

        try {
            const response: IUploadResponse = await uploadMutation.mutateAsync(formData);
            setUploadedFiles(selectedFiles);
        } catch (error) {
            console.log(error);
        } finally {
            setSelectedFiles([]);
        }
    };

    const removeFiles = async () => {
        setIsLoading(true);
        const response: IRemoveResponse = await removeMutation.mutateAsync({
            files: uploadedFiles?.map(file => file.name) as string[]
        });

        setUploadedFiles(null);
        setDocFilter(undefined);
    };

    const removeFilter = () => {
        setDocFilter(undefined);
        setIsOn(!isOn);
    };

    useEffect(() => {
        if (isOn && uploadedFiles) {
            constructAndSetDocFilter();
        } else {
            setDocFilter(undefined);
        }
    }, [isOn, uploadedFiles]);

    const constructAndSetDocFilter = () => {
        if (uploadedFiles && isOn) {
            const names = uploadedFiles.map(file => file.name);

            if (names.length === 1) {
                setDocFilter(names[0]);
            } else {
                const str: string = names.join(" OR ");
                setDocFilter(str);
            }
        }
    };

    const addIcon: IIconProps = { iconName: "Add" };
    const Remove: IIconProps = { iconName: "delete" };

    if (isLoading) {
        return (
            <div className={styles.uploadButtonContainer}>
                <PuffLoader color="rgba(115, 118, 225, 1)" loading={isLoading} size={50} className={styles.loader} />
            </div>
        );
    }

    if (uploadedFiles) {
        return (
            <div className={styles.uploadButtonContainer}>
                <div>
                    {isOn ? (
                        <Tooltip content="Disable filter" relationship="label">
                            <Button size="large" icon={<FilterDismiss24Filled primaryFill="rgba(115, 118, 225, 1)" />} onClick={removeFilter} />
                        </Tooltip>
                    ) : (
                        <Tooltip content="Enable filter" relationship="label">
                            <Button size="large" icon={<Filter24Filled primaryFill="rgba(115, 118, 225, 1)" />} onClick={removeFilter} />
                        </Tooltip>
                    )}
                    <Tooltip content="Remove Files" relationship="label">
                        <Button size="large" icon={<Dismiss24Filled primaryFill="rgba(115, 118, 225, 1)" />} onClick={removeFiles} />
                    </Tooltip>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.uploadButtonContainer}`}>
            <div>
                <Tooltip content="Upload Document" relationship="label">
                    <div>
                        <Button size="large" id="calloutButton" icon={<ArrowUpload24Filled primaryFill="rgba(115, 118, 225, 1)" />} onClick={handleClick} />
                    </div>
                </Tooltip>

                {isCalloutVisible && (
                    <Callout
                        role="dialog"
                        gapSpace={0}
                        className={styles.callout}
                        target="#calloutButton"
                        onDismiss={() => setIsCalloutVisible(false)}
                        setInitialFocus
                        directionalHint={5}
                    >
                        <form onSubmit={handleUploadFile} encType="multipart/form-data">
                            {/* Show the file input only if no files are selected */}
                            {selectedFiles.length === 0 && (
                                <div className={styles.selectContainer}>
                                    <PrimaryButton className={styles.submit}>
                                        Choose files
                                        <input accept=".pdf" className={styles.chooseFiles} type="file" multiple onChange={handleFileChange} />
                                    </PrimaryButton>
                                    <Text className={styles.info}>Only PDF is supported.</Text>
                                </div>
                            )}

                            {/* Show the upload button and the number of selected files if files are selected */}
                            {selectedFiles.length > 0 && (
                                <div className={styles.SubmitContainer}>
                                    <Label>Selected Files ({selectedFiles.length})</Label>
                                    <PrimaryButton className={styles.submit} type="submit">
                                        Submit
                                    </PrimaryButton>
                                </div>
                            )}

                            {/* Display the list of selected files */}
                            {selectedFiles.map((item, index) => {
                                return (
                                    <div key={index} className={styles.list}>
                                        <div className={styles.item}>{item.name}</div>
                                        {/* Button to remove a file from the list */}
                                        <IconButton
                                            className={styles.delete}
                                            onClick={() => handleRemoveFile(item)}
                                            iconProps={Remove}
                                            title="Remove file"
                                            ariaLabel="Remove file"
                                        />
                                    </div>
                                );
                            })}
                        </form>
                    </Callout>
                )}
            </div>
        </div>
    );
};
export default UploadFiles;
