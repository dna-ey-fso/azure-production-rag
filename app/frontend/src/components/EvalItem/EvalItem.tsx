import styles from "./EvalItem.module.css";

interface Props {
    question: string;
    relevance: number;
    coherence: number;
    groundedness: number;
    setActiveSample: (str: string) => void;
}

const EvalItem = ({ question, relevance, coherence, groundedness, setActiveSample }: Props) => {
    const alert = () => {
        const isAnyValueBelowThree = groundedness < 3 || relevance < 3 || coherence < 3;
        return isAnyValueBelowThree;
    };

    return (
        <section className={alert() ? styles.evalItemContainerAlt : styles.evalItemContainer}>
            <div className={styles.evalItem} onClick={() => setActiveSample(question)}>
                <div className={styles.questionContainer}>
                    <span>Question</span>
                    <p>{question}</p>
                </div>
                <div className={styles.metricsContainer}>
                    <div className={styles.metricGridElem}>
                        <span>Groundedness</span>
                        {groundedness}
                    </div>
                    <div className={styles.metricGridElem}>
                        <span>Relevance</span>
                        {relevance}
                    </div>
                    <div className={styles.metricGridElem}>
                        <span>Coherence</span>
                        {coherence}
                    </div>
                </div>
            </div>
        </section>
    );
};
export default EvalItem;
