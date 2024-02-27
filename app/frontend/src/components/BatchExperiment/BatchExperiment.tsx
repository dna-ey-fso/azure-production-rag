import { IconButton } from "@fluentui/react";

import styles from "./BatchExperiment.module.css";

import { useState } from "react";
import { useQuery } from "react-query";
import { v4 as uuidv4 } from "uuid";

import EvalItemDetailed from "../EvalItem/EvalItemDetailed";
import EvalItem from "../EvalItem/EvalItem";
import BatchScorecard from "./BatchScorecard";
import { getExperimentApi } from "../../api";

interface Props {
    id: string;
    onRemove: () => void;
}

const BatchExperiment = ({ id, onRemove }: Props) => {
    const [activeSample, setActiveSample] = useState<any>(null);

    const { data, isLoading, error, isError } = useQuery({
        queryKey: ["getExperiment" + id],
        queryFn: () => getExperimentApi(id, undefined)
    });

    const setActiveSampleQ = (question: string) => {
        const newActiveSample = results.find((sample: any) => sample.question === question);
        setActiveSample(newActiveSample);
    };

    const removeActiveSample = () => {
        setActiveSample(null);
    };

    if (isLoading) {
        return <h1>Loading Experiment Data...</h1>;
    }

    const params = data.evaluate_parameters;
    const results = data.eval_results;
    const summ = data.summary;

    return (
        <div className={styles.batchEvalContainer}>
            <IconButton
                style={{ color: "black" }}
                iconProps={{ iconName: "ChevronLeftMed" }}
                title="Back to overview"
                ariaLabel="Back to overview"
                onClick={() => onRemove()}
                className={styles.backButton}
            />
            <div>
                <BatchScorecard experimentName={id} summ={summ} />
                <section>
                    {activeSample ? (
                        <EvalItemDetailed
                            question={activeSample.question}
                            answer={activeSample.answer}
                            context={activeSample.context}
                            relevance={activeSample.relevance_score}
                            coherence={activeSample.coherence_score}
                            groundedness={activeSample.groundedness_score}
                            removeActiveSample={removeActiveSample}
                        />
                    ) : (
                        <>
                            {results.map((evalItem: any) => (
                                <EvalItem
                                    key={uuidv4()}
                                    question={evalItem.question}
                                    relevance={evalItem.relevance_score}
                                    coherence={evalItem.coherence_score}
                                    groundedness={evalItem.groundedness_score}
                                    setActiveSample={setActiveSampleQ}
                                />
                            ))}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};
export default BatchExperiment;
