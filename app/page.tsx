import MvpApp from "@/components/MvpApp";
import { getLibrarySnapshot } from "@/lib/db";

export default function Home() {
  const library = getLibrarySnapshot();
  return <MvpApp library={library} />;
}
